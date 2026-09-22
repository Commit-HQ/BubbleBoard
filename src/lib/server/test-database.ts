import { readdirSync, readFileSync } from 'node:fs';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import type { ObjectStore, StorageLimits } from './storage';

type Statement = { sql: string; params: SQLInputValue[] };

/** The SQLite behind a local database, with the migrations applied to it so far. */
type Engine = { sqlite: DatabaseSync; applied: Set<string> };
const engines = new WeakMap<D1Database, Engine>();

/**
 * Applies the migrations a database hasn't had yet, up to and including the one whose number is `upTo`, in
 * the order D1 applies them. A test that starts before a migration applies it later to see what it does to
 * the records that were already there.
 */
export function migrate(db: D1Database, upTo = '9999') {
	const engine = engines.get(db);
	if (!engine) throw new Error('Not a local database');
	for (const file of readdirSync('migrations')
		.filter((name) => name.endsWith('.sql'))
		.sort()) {
		if (file.slice(0, 4) > upTo || engine.applied.has(file)) continue;
		engine.sqlite.exec(readFileSync(`migrations/${file}`, 'utf8'));
		engine.applied.add(file);
	}
}

/** The part of D1's API the server uses, over an in-memory SQLite database with the migrations applied. */
export function localDatabase(upTo?: string) {
	const sqlite = new DatabaseSync(':memory:');
	sqlite.exec('PRAGMA foreign_keys = ON');
	const execute = ({ sql, params }: Statement) => {
		const prepared = sqlite.prepare(sql);
		if (prepared.columns().length) {
			return { results: prepared.all(...params), meta: { changes: 0 } };
		}
		return { results: [], meta: { changes: Number(prepared.run(...params).changes) } };
	};
	const statement = (sql: string, params: SQLInputValue[] = []) => ({
		sql,
		params,
		bind: (...values: SQLInputValue[]) => statement(sql, values),
		first: async () => sqlite.prepare(sql).get(...params) ?? null,
		all: async () => execute({ sql, params }),
		run: async () => execute({ sql, params })
	});
	const batch = async (statements: Statement[]) => {
		sqlite.exec('BEGIN');
		try {
			const results = statements.map(execute);
			sqlite.exec('COMMIT');
			return results;
		} catch (cause) {
			sqlite.exec('ROLLBACK');
			throw cause;
		}
	};
	const db = { prepare: (sql: string) => statement(sql), batch } as unknown as D1Database;
	engines.set(db, { sqlite, applied: new Set() });
	migrate(db, upTo);
	return db;
}

/**
 * The part of R2's API the server uses, in memory, with the objects it keeps. The limits default far above
 * what tests store, so a test that cares about them sets only the ones it exercises.
 */
export function localStore(limits: Partial<StorageLimits> = {}) {
	const objects = new Map<string, Uint8Array<ArrayBuffer>>();
	const bucket = {
		put: async (key: string, value: Uint8Array<ArrayBuffer>) => void objects.set(key, value),
		head: async (key: string) => (objects.has(key) ? {} : null),
		get: async (key: string) => {
			const value = objects.get(key);
			return value ? { body: new Response(value).body } : null;
		},
		delete: async (keys: string | string[]) => {
			for (const key of [keys].flat()) objects.delete(key);
		}
	} as unknown as R2Bucket;
	const store: ObjectStore = {
		bucket,
		limits: { bytes: 1e9, uploads: 1000, downloads: 1000, ...limits }
	};
	return { store, objects };
}
