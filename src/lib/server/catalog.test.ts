import { readFileSync } from 'node:fs';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import type { RequestEvent } from '@sveltejs/kit';
import { describe, expect, it } from 'vitest';
import type { NewCredential, NewFamily } from '$lib/api';
import { toBase64Url } from '$lib/base64url';
import { createId } from '$lib/crypto';
import {
	addChild,
	addClassroom,
	addTeacher,
	changeChild,
	changeTeacher,
	deleteClassroom,
	kindergarten,
	removeChild,
	removeTeacher,
	replaceFamilyCard,
	replaceTeacherCard,
	setUp
} from './catalog';
import { identityForCard, requireAdmin, requireStaff, startSession, type Staff } from './session';

// The database boundary on the real migrations: who can read and change what. Profiles and keys are
// placeholders, because the server never opens them.

type Statement = { sql: string; params: SQLInputValue[] };

/** The part of D1's API the server uses, over an in-memory SQLite database with the migrations applied. */
function localDatabase() {
	const sqlite = new DatabaseSync(':memory:');
	sqlite.exec('PRAGMA foreign_keys = ON');
	sqlite.exec(readFileSync('migrations/0001_access.sql', 'utf8'));
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

/** A request to routes that use sessions, with a cookie jar kept across calls. */
function requestTo(db: D1Database) {
	const cookies = new Map<string, string>();
	return {
		platform: { env: { DB: db } },
		cookies: {
			get: (name: string) => cookies.get(name),
			set: (name: string, value: string) => void cookies.set(name, value),
			delete: (name: string) => void cookies.delete(name)
		}
	} as unknown as RequestEvent;
}

function credential(): NewCredential {
	const authToken = toBase64Url(crypto.getRandomValues(new Uint8Array(32)));
	return { id: createId(), authToken, wrappedKey: 'wrapped key' };
}

function newFamily(): NewFamily {
	return {
		id: createId(),
		profile: 'profile',
		familyKeyForStaff: 'wrapped key',
		credential: credential()
	};
}

async function setUpKindergarten(db: D1Database) {
	const teachers = [0, 1].map(() => ({
		id: createId(),
		profile: 'profile',
		credential: credential()
	}));
	await setUp(db, teachers);
	return teachers;
}

async function adminOf(db: D1Database, teacher: { credential: NewCredential }) {
	return (await identityForCard(db, teacher.credential.authToken)) as Staff;
}

async function revision(db: D1Database) {
	const row = await db.prepare('SELECT revision FROM installation').first<{ revision: number }>();
	return row?.revision ?? 0;
}

async function addClassroomTo(db: D1Database) {
	const id = createId();
	await addClassroom(db, { id, profile: 'profile', groupKeyForStaff: 'wrapped key' });
	return id;
}

async function addTeacherTo(db: D1Database, classrooms: string[], admin = false): Promise<Staff> {
	const teacher = {
		id: createId(),
		admin,
		profile: 'profile',
		classrooms,
		credential: credential()
	};
	await addTeacher(db, teacher);
	const { id, wrappedKey } = teacher.credential;
	return { kind: 'staff', credential: id, wrappedKey, teacher: teacher.id, admin };
}

/** A child as an admin device adds one: with a new family card, or with an existing family's. */
async function addChildTo(db: D1Database, classroom: string, family: NewFamily | string) {
	const id = createId();
	const familyId = typeof family === 'string' ? family : family.id;
	await addChild(db, {
		revision: await revision(db),
		id,
		classroom,
		profile: 'profile',
		newFamilies: typeof family === 'string' ? [] : [family],
		addMemberships: [{ family: familyId, classroom, groupKeyForFamily: 'wrapped key' }],
		removeMemberships: [],
		removeFamilies: []
	});
	return id;
}

const conflict = (message: string) => ({ status: 409, body: { message } });

describe('setup', () => {
	it('happens once, and repeating the same setup after a lost response is fine', async () => {
		const db = localDatabase();
		const teachers = await setUpKindergarten(db);
		await expect(setUp(db, teachers)).resolves.toBeUndefined();
		const others = [0, 1].map(() => ({
			id: createId(),
			profile: 'profile',
			credential: credential()
		}));
		await expect(setUp(db, others)).rejects.toMatchObject(conflict('already-set-up'));
		expect(await identityForCard(db, others[0].credential.authToken)).toBeUndefined();
	});
});

describe('staff', () => {
	it('see their own classrooms, with the children and families in them; admins see everything', async () => {
		const db = localDatabase();
		const [admin] = await setUpKindergarten(db);
		const [bubbles, owls] = [await addClassroomTo(db), await addClassroomTo(db)];
		const [inBubbles, inOwls] = [newFamily(), newFamily()];
		const child = await addChildTo(db, bubbles, inBubbles);
		await addChildTo(db, owls, inOwls);
		const teacher = await addTeacherTo(db, [bubbles]);

		const seen = await kindergarten(db, teacher);
		expect(seen.classrooms.map(({ id }) => id)).toEqual([bubbles]);
		expect(seen.children.map(({ id }) => id)).toEqual([child]);
		expect(seen.families).toMatchObject([{ id: inBubbles.id, classrooms: [bubbles] }]);
		expect(seen.teachers.map(({ id }) => id)).toEqual([teacher.teacher]);

		const everything = await kindergarten(db, await adminOf(db, admin));
		expect(everything.classrooms).toHaveLength(2);
		expect(everything.teachers).toHaveLength(3);
		expect(everything.families.map(({ id }) => id).sort()).toEqual(
			[inBubbles.id, inOwls.id].sort()
		);
	});

	it('learn nothing about the other classrooms of a family in theirs', async () => {
		const db = localDatabase();
		await setUpKindergarten(db);
		const [bubbles, owls] = [await addClassroomTo(db), await addClassroomTo(db)];
		const family = newFamily();
		await addChildTo(db, bubbles, family);
		const sister = await addChildTo(db, owls, family.id);
		const teacher = await addTeacherTo(db, [bubbles]);

		const seen = await kindergarten(db, teacher);
		expect(seen.families).toMatchObject([{ id: family.id, classrooms: [bubbles] }]);
		expect(JSON.stringify(seen)).not.toContain(owls);
		expect(JSON.stringify(seen)).not.toContain(sister);
	});

	it('replace family cards only in their own classrooms, which ends the old card', async () => {
		const db = localDatabase();
		await setUpKindergarten(db);
		const [bubbles, owls] = [await addClassroomTo(db), await addClassroomTo(db)];
		const [inBubbles, inOwls] = [newFamily(), newFamily()];
		await addChildTo(db, bubbles, inBubbles);
		await addChildTo(db, owls, inOwls);
		const teacher = await addTeacherTo(db, [bubbles]);

		await expect(replaceFamilyCard(db, teacher, inOwls.id, credential())).rejects.toMatchObject({
			status: 404
		});
		const card = credential();
		await replaceFamilyCard(db, teacher, inBubbles.id, card);
		expect(await identityForCard(db, inBubbles.credential.authToken)).toBeUndefined();
		expect(await identityForCard(db, card.authToken)).toMatchObject({
			kind: 'family',
			family: inBubbles.id
		});
	});
});

describe('sessions', () => {
	it('let a card do only what its owner may', async () => {
		const db = localDatabase();
		const [admin] = await setUpKindergarten(db);
		const bubbles = await addClassroomTo(db);
		const family = newFamily();
		await addChildTo(db, bubbles, family);
		const teacher = await addTeacherTo(db, [bubbles]);
		const connected = async (credentialId: string) => {
			const request = requestTo(db);
			await startSession(request, credentialId);
			return request;
		};

		await expect(requireAdmin(await connected(admin.credential.id))).resolves.toMatchObject({
			admin: true
		});
		const asTeacher = await connected(teacher.credential);
		await expect(requireStaff(asTeacher)).resolves.toMatchObject({ teacher: teacher.teacher });
		await expect(requireAdmin(asTeacher)).rejects.toMatchObject({ status: 403 });
		await expect(requireStaff(await connected(family.credential.id))).rejects.toMatchObject({
			status: 403
		});
		await expect(requireStaff(requestTo(db))).rejects.toMatchObject({ status: 401 });
	});

	it('end when their card is replaced, or after they run out', async () => {
		const db = localDatabase();
		const [admin] = await setUpKindergarten(db);
		const teacher = await addTeacherTo(db, []);
		const replaced = requestTo(db);
		await startSession(replaced, teacher.credential);
		await replaceTeacherCard(db, teacher.teacher, credential());
		await expect(requireStaff(replaced)).rejects.toMatchObject({ status: 401 });

		const expired = requestTo(db);
		await startSession(expired, admin.credential.id);
		await db.prepare('UPDATE sessions SET expires_at = 0').run();
		await expect(requireStaff(expired)).rejects.toMatchObject({ status: 401 });
	});
});

describe('the kindergarten', () => {
	it('always keeps an admin', async () => {
		const db = localDatabase();
		const [admin, recovery] = await setUpKindergarten(db);
		await removeTeacher(db, recovery.id);
		await expect(removeTeacher(db, admin.id)).rejects.toMatchObject(conflict('last-admin'));
		await expect(
			changeTeacher(db, admin.id, { admin: false, profile: 'profile', classrooms: [] })
		).rejects.toMatchObject(conflict('last-admin'));
		expect(await identityForCard(db, admin.credential.authToken)).toMatchObject({ admin: true });
		expect(await identityForCard(db, recovery.credential.authToken)).toBeUndefined();
	});

	it('keeps classrooms with children, and removes a family with its last child', async () => {
		const db = localDatabase();
		await setUpKindergarten(db);
		const bubbles = await addClassroomTo(db);
		const family = newFamily();
		const child = await addChildTo(db, bubbles, family);
		await expect(deleteClassroom(db, bubbles)).rejects.toMatchObject(conflict('not-empty'));

		const removal = {
			revision: await revision(db),
			removeMemberships: [],
			removeFamilies: [family.id]
		};
		await removeChild(db, child, removal);
		expect(await identityForCard(db, family.credential.authToken)).toBeUndefined();
		await expect(deleteClassroom(db, bubbles)).resolves.toBeUndefined();
	});

	it('refuses a change made from records that another change has moved on from', async () => {
		const db = localDatabase();
		const [admin] = await setUpKindergarten(db);
		const [bubbles, owls, ladybirds] = [
			await addClassroomTo(db),
			await addClassroomTo(db),
			await addClassroomTo(db)
		];
		const family = newFamily();
		const child = await addChildTo(db, bubbles, family);
		await addChildTo(db, owls, family.id);
		const read = await revision(db);
		const same = { revision: read, profile: 'profile', newFamilies: [], removeFamilies: [] };

		// One admin takes the family card off the child in Bubbles…
		await changeChild(db, child, {
			...same,
			classroom: bubbles,
			addMemberships: [],
			removeMemberships: [{ family: family.id, classroom: bubbles }]
		});
		// …while another, working from the same records, moves the child with the card to Ladybirds.
		const move = changeChild(db, child, {
			...same,
			classroom: ladybirds,
			addMemberships: [
				{ family: family.id, classroom: ladybirds, groupKeyForFamily: 'wrapped key' }
			],
			removeMemberships: [{ family: family.id, classroom: bubbles }]
		});
		await expect(move).rejects.toMatchObject(conflict('stale'));
		const { families } = await kindergarten(db, await adminOf(db, admin));
		expect(families).toMatchObject([{ id: family.id, classrooms: [owls] }]);
	});
});
