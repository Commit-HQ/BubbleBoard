import { readFileSync } from 'node:fs';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import type { RequestEvent } from '@sveltejs/kit';
import { describe, expect, it } from 'vitest';
import type { FamilyLinks, NewCredential, NewFamily, Staff } from '$lib/api';
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
import { identityForCard, requireAdmin, requireStaff, startSession, type Admin } from './session';

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

function setupTeachers() {
	return [0, 1].map(() => ({ id: createId(), profile: 'profile', credential: credential() }));
}

/** A set-up installation: its admin and recovery teachers, and the admin as a checked session gives it. */
async function setUpKindergarten(db: D1Database) {
	const teachers = setupTeachers();
	await setUp(db, teachers);
	const admin = (await identityForCard(db, teachers[0].credential.authToken)) as Admin;
	return { teachers, admin };
}

async function revision(db: D1Database) {
	const row = await db.prepare('SELECT revision FROM installation').first<{ revision: number }>();
	return row?.revision ?? 0;
}

async function addClassroomTo(db: D1Database, admin: Admin) {
	const id = createId();
	await addClassroom(db, admin, { id, profile: 'profile', groupKeyForStaff: 'wrapped key' });
	return id;
}

async function addTeacherTo(db: D1Database, admin: Admin, classrooms: string[]): Promise<Staff> {
	const teacher = {
		id: createId(),
		admin: false,
		profile: 'profile',
		classrooms,
		credential: credential()
	};
	await addTeacher(db, admin, teacher);
	const { id, wrappedKey } = teacher.credential;
	return { kind: 'staff', credential: id, wrappedKey, teacher: teacher.id, admin: false };
}

/** Family links as an admin device works them out for a change. */
async function links(db: D1Database, change: Partial<FamilyLinks>): Promise<FamilyLinks> {
	const none = { newFamilies: [], addMemberships: [], removeMemberships: [], removeFamilies: [] };
	return { revision: await revision(db), ...none, ...change };
}

/** A child as an admin device adds one: with a new family card, or with an existing family's. */
async function addChildTo(
	db: D1Database,
	admin: Admin,
	classroom: string,
	family: NewFamily | string
) {
	const id = createId();
	const familyId = typeof family === 'string' ? family : family.id;
	await addChild(db, admin, {
		id,
		classroom,
		profile: 'profile',
		...(await links(db, {
			newFamilies: typeof family === 'string' ? [] : [family],
			addMemberships: [{ family: familyId, classroom, groupKeyForFamily: 'wrapped key' }]
		}))
	});
	return id;
}

const conflict = (message: string) => ({ status: 409, body: { message } });

describe('setup', () => {
	it('happens once, and repeating the same setup after a lost response is fine', async () => {
		const db = localDatabase();
		const teachers = setupTeachers();
		await setUp(db, teachers);
		await expect(setUp(db, teachers)).resolves.toBeUndefined();
		const others = setupTeachers();
		await expect(setUp(db, others)).rejects.toMatchObject(conflict('already-set-up'));
		expect(await identityForCard(db, others[0].credential.authToken)).toBeUndefined();
	});
});

describe('staff', () => {
	it('see their own classrooms, with the children and families in them; admins see everything', async () => {
		const db = localDatabase();
		const { admin } = await setUpKindergarten(db);
		const [bubbles, owls] = [await addClassroomTo(db, admin), await addClassroomTo(db, admin)];
		const [inBubbles, inOwls] = [newFamily(), newFamily()];
		const child = await addChildTo(db, admin, bubbles, inBubbles);
		await addChildTo(db, admin, owls, inOwls);
		const teacher = await addTeacherTo(db, admin, [bubbles]);

		const seen = await kindergarten(db, teacher);
		expect(seen.classrooms.map(({ id }) => id)).toEqual([bubbles]);
		expect(seen.children.map(({ id }) => id)).toEqual([child]);
		expect(seen.families).toMatchObject([{ id: inBubbles.id, classrooms: [bubbles] }]);
		expect(seen.teachers).toMatchObject([
			{ id: teacher.teacher, admin: false, classrooms: [bubbles] }
		]);

		const everything = await kindergarten(db, admin);
		expect(everything.classrooms).toHaveLength(2);
		expect(everything.teachers).toHaveLength(3);
		expect(everything.families.map(({ id }) => id).sort()).toEqual(
			[inBubbles.id, inOwls.id].sort()
		);
	});

	it('learn nothing about the other classrooms of a family in theirs', async () => {
		const db = localDatabase();
		const { admin } = await setUpKindergarten(db);
		const [bubbles, owls] = [await addClassroomTo(db, admin), await addClassroomTo(db, admin)];
		const family = newFamily();
		await addChildTo(db, admin, bubbles, family);
		const sister = await addChildTo(db, admin, owls, family.id);
		const teacher = await addTeacherTo(db, admin, [bubbles]);

		const seen = await kindergarten(db, teacher);
		expect(seen.families).toMatchObject([{ id: family.id, classrooms: [bubbles] }]);
		expect(JSON.stringify(seen)).not.toContain(owls);
		expect(JSON.stringify(seen)).not.toContain(sister);
	});

	it('replace family cards only in their own classrooms, which ends the old card', async () => {
		const db = localDatabase();
		const { admin } = await setUpKindergarten(db);
		const [bubbles, owls] = [await addClassroomTo(db, admin), await addClassroomTo(db, admin)];
		const [inBubbles, inOwls] = [newFamily(), newFamily()];
		await addChildTo(db, admin, bubbles, inBubbles);
		await addChildTo(db, admin, owls, inOwls);
		const teacher = await addTeacherTo(db, admin, [bubbles]);

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
		const { teachers, admin } = await setUpKindergarten(db);
		const bubbles = await addClassroomTo(db, admin);
		const family = newFamily();
		await addChildTo(db, admin, bubbles, family);
		const teacher = await addTeacherTo(db, admin, [bubbles]);
		const connected = async (credentialId: string) => {
			const request = requestTo(db);
			await startSession(request, credentialId);
			return request;
		};

		await expect(requireAdmin(await connected(teachers[0].credential.id))).resolves.toMatchObject({
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
		const { teachers, admin } = await setUpKindergarten(db);
		const teacher = await addTeacherTo(db, admin, []);
		const replaced = requestTo(db);
		await startSession(replaced, teacher.credential);
		await replaceTeacherCard(db, admin, teacher.teacher, credential());
		await expect(requireStaff(replaced)).rejects.toMatchObject({ status: 401 });

		const expired = requestTo(db);
		await startSession(expired, teachers[0].credential.id);
		await db.prepare('UPDATE sessions SET expires_at = 0').run();
		await expect(requireStaff(expired)).rejects.toMatchObject({ status: 401 });
	});
});

describe('the kindergarten', () => {
	it('always keeps an admin', async () => {
		const db = localDatabase();
		const { teachers, admin } = await setUpKindergarten(db);
		const [adminTeacher, recovery] = teachers;
		await removeTeacher(db, admin, recovery.id);
		await expect(removeTeacher(db, admin, adminTeacher.id)).rejects.toMatchObject(
			conflict('last-admin')
		);
		await expect(
			changeTeacher(db, admin, adminTeacher.id, {
				admin: false,
				profile: 'profile',
				classrooms: []
			})
		).rejects.toMatchObject(conflict('last-admin'));
		expect(await identityForCard(db, adminTeacher.credential.authToken)).toMatchObject({
			admin: true
		});
		expect(await identityForCard(db, recovery.credential.authToken)).toBeUndefined();
	});

	it('keeps classrooms with children, and removes a family with its last child', async () => {
		const db = localDatabase();
		const { admin } = await setUpKindergarten(db);
		const bubbles = await addClassroomTo(db, admin);
		const family = newFamily();
		const child = await addChildTo(db, admin, bubbles, family);
		await expect(deleteClassroom(db, admin, bubbles)).rejects.toMatchObject(conflict('not-empty'));

		await removeChild(db, admin, child, await links(db, { removeFamilies: [family.id] }));
		expect(await identityForCard(db, family.credential.authToken)).toBeUndefined();
		await expect(deleteClassroom(db, admin, bubbles)).resolves.toMatchObject({ classrooms: [] });
	});

	it('refuses a change made from records that another change has moved on from', async () => {
		const db = localDatabase();
		const { admin } = await setUpKindergarten(db);
		const [bubbles, owls, ladybirds] = [
			await addClassroomTo(db, admin),
			await addClassroomTo(db, admin),
			await addClassroomTo(db, admin)
		];
		const family = newFamily();
		const child = await addChildTo(db, admin, bubbles, family);
		await addChildTo(db, admin, owls, family.id);
		const leaveBubbles = { removeMemberships: [{ family: family.id, classroom: bubbles }] };
		const move = {
			profile: 'profile',
			classroom: ladybirds,
			...(await links(db, {
				...leaveBubbles,
				addMemberships: [
					{ family: family.id, classroom: ladybirds, groupKeyForFamily: 'wrapped key' }
				]
			}))
		};

		// One admin takes the family card off the child in Bubbles…
		await changeChild(db, admin, child, {
			profile: 'profile',
			classroom: bubbles,
			...(await links(db, leaveBubbles))
		});
		// …while another, working from the same records, moves the child with the card to Ladybirds.
		await expect(changeChild(db, admin, child, move)).rejects.toMatchObject(conflict('stale'));
		const { families } = await kindergarten(db, admin);
		expect(families).toMatchObject([{ id: family.id, classrooms: [owls] }]);
	});
});
