import { readdirSync, readFileSync } from 'node:fs';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import type { ObjectStore, StorageLimits } from './storage';

type Statement = { sql: string; params: SQLInputValue[] };

/** The part of D1's API the server uses, over an in-memory SQLite database with the migrations applied. */
export function localDatabase() {
	const sqlite = new DatabaseSync(':memory:');
	sqlite.exec('PRAGMA foreign_keys = ON');
	// Every migration, in order, as D1 applies them.
	for (const file of readdirSync('migrations')
		.filter((name) => name.endsWith('.sql'))
		.sort()) {
		sqlite.exec(readFileSync(`migrations/${file}`, 'utf8'));
	}
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
	return { prepare: (sql: string) => statement(sql), batch } as unknown as D1Database;
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
