import { readdirSync, readFileSync } from 'node:fs';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import type { RequestEvent } from '@sveltejs/kit';
import { describe, expect, it, vi } from 'vitest';
import type {
	FamilyIdentity,
	FamilyLinks,
	Identity,
	NewCredential,
	NewFamily,
	Staff
} from '$lib/api';
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
	replaceFamilyCards,
	replaceTeacherCard,
	setUp
} from './catalog';
import { day } from '$lib/notices';
import { cleanUp } from './cleanup';
import {
	board,
	changeNotice,
	deleteNotice,
	fileBytes,
	markSeen,
	postNotice,
	uploadFile,
	vote
} from './notices';
import { boardPhotos, photoBytes, putUpPhoto, takeDownPhoto } from './photos';
import {
	createVapidSecret,
	deliver,
	recipients,
	subscribe,
	type PushEnv,
	type PushMessage
} from './push';
import {
	endSession,
	identityForCard,
	requireAdmin,
	requireIdentity,
	requireStaff,
	sessionHash,
	startSession,
	type Admin
} from './session';
import {
	deleteMarked,
	getObject,
	putObject,
	type ObjectStore,
	type StorageLimits
} from './storage';

// The database boundary on the real migrations: who can read and change what. Profiles and keys are
// placeholders, because the server never opens them.

type Statement = { sql: string; params: SQLInputValue[] };

/** The part of D1's API the server uses, over an in-memory SQLite database with the migrations applied. */
function localDatabase() {
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
 * The part of R2's API the server uses, in memory, with the objects it keeps, and limits far above what
 * tests store unless a test sets its own.
 */
function localStore(limits: Partial<StorageLimits> = {}) {
	const objects = new Map<string, Uint8Array<ArrayBuffer>>();
	const bucket = {
		put: async (key: string, value: Uint8Array<ArrayBuffer>) => void objects.set(key, value),
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

/** A device connected with a card: requests carrying the session the card started. */
async function deviceWith(db: D1Database, credentialId: string) {
	const request = requestTo(db);
	await startSession(request, credentialId);
	return request;
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

/** The bytes the database counts as stored in R2. */
async function storedBytes(db: D1Database) {
	const row = await db
		.prepare('SELECT COALESCE(SUM(bytes), 0) AS bytes FROM stored_objects')
		.first<{ bytes: number }>();
	return row?.bytes;
}

/** A family as its card's session identifies it. */
const familyOf = async (db: D1Database, { credential }: NewFamily) =>
	(await identityForCard(db, credential.authToken)) as FamilyIdentity;

const read = async (response: Response) => new Uint8Array(await response.arrayBuffer());
const conflict = (message: string) => ({ status: 409, body: { message } });
const refused = (message: string, status = 429) => ({ status, body: { message } });

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

	it('replace family cards together, only in their own classrooms, which ends the old cards', async () => {
		const db = localDatabase();
		const { admin } = await setUpKindergarten(db);
		const [bubbles, owls] = [await addClassroomTo(db, admin), await addClassroomTo(db, admin)];
		const [first, second, inOwls] = [newFamily(), newFamily(), newFamily()];
		await addChildTo(db, admin, bubbles, first);
		await addChildTo(db, admin, bubbles, second);
		await addChildTo(db, admin, owls, inOwls);
		const teacher = await addTeacherTo(db, admin, [bubbles]);
		const newCards = (...families: NewFamily[]) =>
			families.map(({ id }) => ({ family: id, credential: credential() }));

		// A family outside the teacher's classrooms stops the whole change.
		await expect(replaceFamilyCards(db, teacher, newCards(first, inOwls))).rejects.toMatchObject({
			status: 404
		});
		expect(await identityForCard(db, first.credential.authToken)).toMatchObject({
			family: first.id
		});

		const cards = newCards(first, second);
		await replaceFamilyCards(db, teacher, cards);
		for (const [index, family] of [first, second].entries()) {
			expect(await identityForCard(db, family.credential.authToken)).toBeUndefined();
			expect(await identityForCard(db, cards[index].credential.authToken)).toMatchObject({
				kind: 'family',
				family: family.id
			});
		}
		await expect(replaceFamilyCards(db, admin, newCards(inOwls))).resolves.toBeUndefined();
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

		await expect(
			requireAdmin(await deviceWith(db, teachers[0].credential.id))
		).resolves.toMatchObject({
			admin: true
		});
		const asTeacher = await deviceWith(db, teacher.credential);
		await expect(requireStaff(asTeacher)).resolves.toMatchObject({ teacher: teacher.teacher });
		await expect(requireAdmin(asTeacher)).rejects.toMatchObject({ status: 403 });
		await expect(requireStaff(await deviceWith(db, family.credential.id))).rejects.toMatchObject({
			status: 403
		});
		await expect(requireStaff(requestTo(db))).rejects.toMatchObject({ status: 401 });
	});

	it('end when their card is replaced or its owner removed, or after they run out', async () => {
		const db = localDatabase();
		const { teachers, admin } = await setUpKindergarten(db);
		const bubbles = await addClassroomTo(db, admin);
		const [family, leaving] = [newFamily(), newFamily()];
		await addChildTo(db, admin, bubbles, family);
		const child = await addChildTo(db, admin, bubbles, leaving);
		const [teacher, former] = [
			await addTeacherTo(db, admin, [bubbles]),
			await addTeacherTo(db, admin, [bubbles])
		];
		const adminDevice = await deviceWith(db, teachers[0].credential.id);
		const devices = [
			await deviceWith(db, teacher.credential),
			await deviceWith(db, family.credential.id),
			await deviceWith(db, former.credential),
			await deviceWith(db, leaving.credential.id)
		];

		await replaceTeacherCard(db, admin, teacher.teacher, credential());
		await replaceFamilyCards(db, admin, [{ family: family.id, credential: credential() }]);
		await removeTeacher(db, admin, former.teacher);
		await removeChild(db, admin, child, await links(db, { removeFamilies: [leaving.id] }));
		for (const device of devices) {
			await expect(requireIdentity(device)).rejects.toMatchObject({ status: 401 });
		}

		// Other devices stay connected until their sessions run out.
		await expect(requireAdmin(adminDevice)).resolves.toMatchObject({ admin: true });
		await db.prepare('UPDATE sessions SET expires_at = 0').run();
		await expect(requireAdmin(adminDevice)).rejects.toMatchObject({ status: 401 });
	});

	it('renew while in use, in the database and in the cookie', async () => {
		const db = localDatabase();
		const { teachers } = await setUpKindergarten(db);
		const request = await deviceWith(db, teachers[0].credential.id);
		const setCookie = vi.spyOn(request.cookies, 'set');
		await requireStaff(request);
		expect(setCookie).not.toHaveBeenCalled();

		// A session used near the end of its 90 days gets all of them again.
		await db
			.prepare('UPDATE sessions SET expires_at = ?')
			.bind(Date.now() + day)
			.run();
		await requireStaff(request);
		const session = await db
			.prepare('SELECT expires_at AS expiresAt FROM sessions')
			.first<{ expiresAt: number }>();
		expect(session?.expiresAt).toBeGreaterThan(Date.now() + 89 * day);
		expect(setCookie).toHaveBeenCalledWith(
			'session',
			expect.any(String),
			expect.objectContaining({ maxAge: (90 * day) / 1000 })
		);
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
				revision: await revision(db),
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
		const { bucket } = localStore().store;
		const { admin } = await setUpKindergarten(db);
		const bubbles = await addClassroomTo(db, admin);
		const family = newFamily();
		const child = await addChildTo(db, admin, bubbles, family);
		await expect(deleteClassroom(db, bucket, admin, bubbles)).rejects.toMatchObject(
			conflict('not-empty')
		);

		await removeChild(db, admin, child, await links(db, { removeFamilies: [family.id] }));
		expect(await identityForCard(db, family.credential.authToken)).toBeUndefined();
		await expect(deleteClassroom(db, bucket, admin, bubbles)).resolves.toMatchObject({
			classrooms: []
		});
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

	it('refuses a teacher change from an outdated form, so it can’t give back what was taken away', async () => {
		const db = localDatabase();
		const { admin } = await setUpKindergarten(db);
		const bubbles = await addClassroomTo(db, admin);
		const { teacher } = await addTeacherTo(db, admin, [bubbles]);
		const read = { revision: await revision(db), admin: false, classrooms: [bubbles] };

		// One admin takes the teacher out of Bubbles…
		await changeTeacher(db, admin, teacher, { ...read, profile: 'profile', classrooms: [] });
		// …while another, with the teacher's page open from before, corrects the name.
		await expect(
			changeTeacher(db, admin, teacher, { ...read, profile: 'corrected' })
		).rejects.toMatchObject(conflict('stale'));
		const { teachers } = await kindergarten(db, admin);
		expect(teachers).toContainEqual({
			id: teacher,
			admin: false,
			profile: 'profile',
			classrooms: []
		});
	});
});

describe('notices', () => {
	const keys = (classrooms: string[]) =>
		classrooms.map((classroom) => ({ classroom, noticeKey: 'wrapped key' }));
	const notice = (classrooms: string[], days = 30, files: string[] = []) => ({
		id: createId(),
		content: 'content',
		days,
		poll: false,
		counts: false,
		classrooms: keys(classrooms),
		files
	});
	const change = (classrooms: string[], announce = false, files: string[] = []) => ({
		content: 'changed',
		days: 30,
		announce,
		poll: false,
		counts: false,
		classrooms: keys(classrooms),
		files
	});
	/** A family's answer, as a device that read the poll's counts as `counts` sends it. */
	const answer = (choice: string, counts = false) => ({ choice, counts });
	const ids = (records: { id: string }[]) => records.map(({ id }) => id);
	const count = async (db: D1Database) =>
		(await db.prepare('SELECT COUNT(*) AS count FROM notices').first<{ count: number }>())?.count;
	// Notices without files never reach R2.
	const { bucket } = localStore().store;

	it('go to a teacher’s own classrooms, or any for an admin', async () => {
		const db = localDatabase();
		const { admin } = await setUpKindergarten(db);
		const [bubbles, owls] = [await addClassroomTo(db, admin), await addClassroomTo(db, admin)];
		const teacher = await addTeacherTo(db, admin, [bubbles]);

		await expect(postNotice(db, teacher, notice([bubbles, owls]))).rejects.toMatchObject(
			conflict('stale')
		);
		const own = notice([bubbles]);
		expect(ids(await postNotice(db, teacher, own))).toEqual([own.id]);
		const elsewhere = notice([owls]);
		expect(ids(await postNotice(db, admin, elsewhere)).sort()).toEqual(
			[own.id, elsewhere.id].sort()
		);
		expect(ids(await board(db, teacher))).toEqual([own.id]);
	});

	it('reach each family once, with the keys of its own classrooms only', async () => {
		const db = localDatabase();
		const { admin } = await setUpKindergarten(db);
		const [bubbles, owls, ladybirds] = [
			await addClassroomTo(db, admin),
			await addClassroomTo(db, admin),
			await addClassroomTo(db, admin)
		];
		const [both, owlsOnly, elsewhere] = [newFamily(), newFamily(), newFamily()];
		await addChildTo(db, admin, bubbles, both);
		await addChildTo(db, admin, owls, both.id);
		await addChildTo(db, admin, owls, owlsOnly);
		await addChildTo(db, admin, ladybirds, elsewhere);
		await postNotice(db, admin, notice([bubbles, owls]));
		const boardOf = async (family: NewFamily) =>
			board(db, (await identityForCard(db, family.credential.authToken))!);

		const [seen] = await boardOf(both);
		expect(await boardOf(both)).toHaveLength(1);
		expect(seen.classrooms.map(({ classroom }) => classroom).sort()).toEqual(
			[bubbles, owls].sort()
		);
		expect((await boardOf(owlsOnly)).map(({ classrooms }) => classrooms)).toEqual([keys([owls])]);
		expect(await boardOf(elsewhere)).toEqual([]);
	});

	it('change and delete for their author and admins, and a removed teacher’s for admins', async () => {
		const db = localDatabase();
		const { admin } = await setUpKindergarten(db);
		const bubbles = await addClassroomTo(db, admin);
		const [author, colleague] = [
			await addTeacherTo(db, admin, [bubbles]),
			await addTeacherTo(db, admin, [bubbles])
		];
		const posted = notice([bubbles]);
		await postNotice(db, author, posted);

		await expect(
			changeNotice(db, bucket, colleague, posted.id, change([bubbles]))
		).rejects.toMatchObject({ status: 403 });
		await expect(deleteNotice(db, bucket, colleague, posted.id)).rejects.toMatchObject({
			status: 403
		});
		expect(await changeNotice(db, bucket, author, posted.id, change([bubbles]))).toMatchObject([
			{ id: posted.id, content: 'changed', editedAt: expect.any(Number) }
		]);

		await removeTeacher(db, admin, author.teacher);
		expect(await board(db, admin)).toMatchObject([{ id: posted.id, teacher: null }]);
		await expect(deleteNotice(db, bucket, author, posted.id)).rejects.toMatchObject({
			status: 403
		});
		expect(await deleteNotice(db, bucket, admin, posted.id)).toEqual([]);
		expect(await count(db)).toBe(0);
	});

	it('go back to the top when a change announces them, and leave when their days are up', async () => {
		const db = localDatabase();
		const { admin } = await setUpKindergarten(db);
		const bubbles = await addClassroomTo(db, admin);
		const [first, second] = [notice([bubbles]), notice([bubbles], 1)];
		vi.useFakeTimers({ toFake: ['Date'] });
		try {
			vi.setSystemTime(1_000_000);
			await postNotice(db, admin, first);
			vi.setSystemTime(2_000_000);
			expect(ids(await postNotice(db, admin, second))).toEqual([second.id, first.id]);
			vi.setSystemTime(3_000_000);
			expect(ids(await changeNotice(db, bucket, admin, first.id, change([bubbles])))).toEqual([
				second.id,
				first.id
			]);
			vi.setSystemTime(4_000_000);
			expect(ids(await changeNotice(db, bucket, admin, first.id, change([bubbles], true)))).toEqual(
				[first.id, second.id]
			);

			// A day after it was posted, the second notice is off every board, and the daily cleanup deletes it.
			vi.setSystemTime(2_000_000 + day);
			expect(ids(await board(db, admin))).toEqual([first.id]);
			expect(await count(db)).toBe(2);
			await cleanUp({ DB: db, FILES: bucket });
			expect(await count(db)).toBe(1);
		} finally {
			vi.useRealTimers();
		}
	});

	it('go with the last of their classrooms', async () => {
		const db = localDatabase();
		const { admin } = await setUpKindergarten(db);
		const [bubbles, owls] = [await addClassroomTo(db, admin), await addClassroomTo(db, admin)];
		const shared = notice([bubbles, owls]);
		await postNotice(db, admin, shared);
		await postNotice(db, admin, notice([owls]));

		await deleteClassroom(db, bucket, admin, owls);
		expect(await board(db, admin)).toMatchObject([{ id: shared.id, classrooms: keys([bubbles]) }]);
		expect(await count(db)).toBe(1);
	});

	it('show who marked them as seen: a family its own mark, teachers their families’, admins every one', async () => {
		const db = localDatabase();
		const { admin } = await setUpKindergarten(db);
		const [bubbles, owls, ladybirds] = [
			await addClassroomTo(db, admin),
			await addClassroomTo(db, admin),
			await addClassroomTo(db, admin)
		];
		const [inBubbles, inOwls, elsewhere] = [newFamily(), newFamily(), newFamily()];
		await addChildTo(db, admin, bubbles, inBubbles);
		await addChildTo(db, admin, owls, inOwls);
		await addChildTo(db, admin, ladybirds, elsewhere);
		const teacher = await addTeacherTo(db, admin, [bubbles]);
		const posted = notice([bubbles, owls]);
		await postNotice(db, admin, posted);
		const seenBy = async (viewer: Identity) => (await board(db, viewer))[0]?.seen.sort();

		await markSeen(db, await familyOf(db, inBubbles), posted.id);
		// Marking it again changes nothing, and the family gets the board back with its own mark.
		expect(await markSeen(db, await familyOf(db, inBubbles), posted.id)).toMatchObject([
			{ id: posted.id, seen: [inBubbles.id] }
		]);
		await markSeen(db, await familyOf(db, inOwls), posted.id);
		await expect(markSeen(db, await familyOf(db, elsewhere), posted.id)).rejects.toMatchObject({
			status: 404
		});

		expect(await seenBy(admin)).toEqual([inBubbles.id, inOwls.id].sort());
		expect(await seenBy(teacher)).toEqual([inBubbles.id]);
		expect(await seenBy(await familyOf(db, inOwls))).toEqual([inOwls.id]);

		// A change keeps the marks, unless it notifies everyone again.
		await changeNotice(db, bucket, admin, posted.id, change([bubbles, owls]));
		expect(await seenBy(admin)).toHaveLength(2);
		await changeNotice(db, bucket, admin, posted.id, change([bubbles, owls], true));
		expect(await seenBy(admin)).toEqual([]);
	});

	it('take one answer from each family that sees a poll, which marks it as seen, and lose them with the poll', async () => {
		const db = localDatabase();
		const { admin } = await setUpKindergarten(db);
		const [bubbles, owls] = [await addClassroomTo(db, admin), await addClassroomTo(db, admin)];
		const [inBubbles, inOwls] = [newFamily(), newFamily()];
		await addChildTo(db, admin, bubbles, inBubbles);
		await addChildTo(db, admin, owls, inOwls);
		const teacher = await addTeacherTo(db, admin, [bubbles]);
		const [withPoll, withoutPoll] = [{ ...notice([bubbles]), poll: true }, notice([bubbles])];
		await postNotice(db, admin, withPoll);
		await postNotice(db, admin, withoutPoll);
		const family = await familyOf(db, inBubbles);
		const answered = async (viewer: Identity) =>
			(await board(db, viewer)).find(({ id }) => id === withPoll.id);

		await vote(db, family, withPoll.id, answer('first answer'));
		await vote(db, family, withPoll.id, answer('changed answer'));
		await expect(
			vote(db, await familyOf(db, inOwls), withPoll.id, answer('answer'))
		).rejects.toMatchObject({ status: 404 });
		await expect(vote(db, family, withoutPoll.id, answer('answer'))).rejects.toMatchObject(
			conflict('stale')
		);
		expect(await answered(teacher)).toMatchObject({
			votes: [{ family: inBubbles.id, choice: 'changed answer' }],
			seen: [inBubbles.id]
		});
		expect((await answered(family))?.votes).toHaveLength(1);

		// A change that keeps the poll keeps its answers, and one that takes the poll off removes them.
		await changeNotice(db, bucket, admin, withPoll.id, { ...change([bubbles]), poll: true });
		expect((await answered(admin))?.votes).toHaveLength(1);
		await changeNotice(db, bucket, admin, withPoll.id, change([bubbles]));
		expect((await answered(admin))?.votes).toEqual([]);
		await expect(vote(db, family, withPoll.id, answer('answer'))).rejects.toMatchObject(
			conflict('stale')
		);
	});

	it('show every family a notice is for all the answers to its poll while they see its counts, and lose the answers when that changes', async () => {
		const db = localDatabase();
		const { admin } = await setUpKindergarten(db);
		const [bubbles, owls, ladybirds] = [
			await addClassroomTo(db, admin),
			await addClassroomTo(db, admin),
			await addClassroomTo(db, admin)
		];
		const [inBubbles, inOwls, inLadybirds] = [newFamily(), newFamily(), newFamily()];
		await addChildTo(db, admin, bubbles, inBubbles);
		await addChildTo(db, admin, owls, inOwls);
		await addChildTo(db, admin, ladybirds, inLadybirds);
		const counted = { ...notice([bubbles, owls]), poll: true, counts: true };
		const elsewhere = { ...notice([ladybirds]), poll: true, counts: true };
		await postNotice(db, admin, counted);
		await postNotice(db, admin, elsewhere);
		const [ana, ivo, eva] = await Promise.all(
			[inBubbles, inOwls, inLadybirds].map((family) => familyOf(db, family))
		);
		const votes = async (viewer: Identity, id = counted.id) =>
			(await board(db, viewer)).find((record) => record.id === id)?.votes;

		// A device that read the counts the other way has an outdated board.
		await expect(vote(db, ana, counted.id, answer('yes'))).rejects.toMatchObject(conflict('stale'));
		await vote(db, ana, counted.id, answer('yes', true));
		await vote(db, ivo, counted.id, answer('no', true));
		await vote(db, eva, elsewhere.id, answer('yes', true));
		// Each family a notice is for gets every answer to its poll, to count, and none of another notice's.
		expect(await votes(ana)).toHaveLength(2);
		expect(await votes(ivo)).toHaveLength(2);
		expect(await votes(eva, elsewhere.id)).toEqual([{ family: inLadybirds.id, choice: 'yes' }]);

		// A change that keeps the counts keeps the answers. One that stops them removes the answers, which were
		// encrypted for everyone, and each family sees only its own again.
		const keeping = { ...change([bubbles, owls]), poll: true, counts: true };
		await changeNotice(db, bucket, admin, counted.id, keeping);
		expect(await votes(admin)).toHaveLength(2);
		await changeNotice(db, bucket, admin, counted.id, { ...keeping, counts: false });
		expect(await votes(admin)).toEqual([]);
		await vote(db, ana, counted.id, answer('yes'));
		await vote(db, ivo, counted.id, answer('no'));
		expect(await votes(ivo)).toEqual([{ family: inOwls.id, choice: 'no' }]);
		expect(await votes(admin)).toHaveLength(2);
	});

	it('carry the files uploaded for them, which go when a change leaves them out or the notice goes', async () => {
		const db = localDatabase();
		const { store, objects } = localStore();
		const { admin } = await setUpKindergarten(db);
		const [bubbles, owls] = [await addClassroomTo(db, admin), await addClassroomTo(db, admin)];
		const [inBubbles, inOwls] = [newFamily(), newFamily()];
		await addChildTo(db, admin, bubbles, inBubbles);
		await addChildTo(db, admin, owls, inOwls);
		const [author, colleague] = [
			await addTeacherTo(db, admin, [bubbles]),
			await addTeacherTo(db, admin, [bubbles])
		];
		const posted = notice([bubbles]);
		const [menu, form, later] = [createId(), createId(), createId()];
		const file = (value: number) => new Uint8Array(64).fill(value);
		const key = (id: string) => `notices/${posted.id}/${id}`;

		// A notice can't name a file that wasn't uploaded for it.
		await expect(postNotice(db, author, { ...posted, files: [menu] })).rejects.toMatchObject(
			conflict('stale')
		);
		await uploadFile(db, store, author, posted.id, menu, file(1));
		await uploadFile(db, store, author, posted.id, form, file(2));
		await postNotice(db, author, { ...posted, files: [menu, form] });

		// Families who see the notice fetch its files; others don't.
		const [family, other] = [await familyOf(db, inBubbles), await familyOf(db, inOwls)];
		expect(await read(await fileBytes(db, store, family, posted.id, menu))).toEqual(file(1));
		await expect(fileBytes(db, store, other, posted.id, menu)).rejects.toMatchObject({
			status: 404
		});

		// Once the notice is up, only those who may change it upload files for it, and none twice.
		await expect(uploadFile(db, store, colleague, posted.id, later, file(3))).rejects.toMatchObject(
			{ status: 403 }
		);
		await expect(uploadFile(db, store, author, posted.id, menu, file(9))).rejects.toMatchObject(
			conflict('stored')
		);
		expect(await read(await fileBytes(db, store, family, posted.id, menu))).toEqual(file(1));
		await uploadFile(db, store, author, posted.id, later, file(3));
		await changeNotice(
			db,
			store.bucket,
			author,
			posted.id,
			change([bubbles], false, [form, later])
		);
		expect([...objects.keys()].sort()).toEqual([key(form), key(later)].sort());
		await expect(fileBytes(db, store, family, posted.id, menu)).rejects.toMatchObject({
			status: 404
		});

		await deleteNotice(db, store.bucket, author, posted.id);
		expect(objects.size).toBe(0);
		expect(await storedBytes(db)).toBe(0);
	});

	it('can’t name a file on its way out, which can’t be stored again until it’s gone', async () => {
		const db = localDatabase();
		const { store, objects } = localStore();
		const { admin } = await setUpKindergarten(db);
		const bubbles = await addClassroomTo(db, admin);
		const posted = notice([bubbles]);
		const file = createId();
		await uploadFile(db, store, admin, posted.id, file, new Uint8Array(8));

		// A deletion has marked the file, as another change's would just before it deletes its bytes.
		await db.prepare('UPDATE stored_objects SET deleting = 1').run();
		await expect(postNotice(db, admin, { ...posted, files: [file] })).rejects.toMatchObject(
			conflict('stale')
		);
		await expect(
			uploadFile(db, store, admin, posted.id, file, new Uint8Array(8))
		).rejects.toMatchObject(conflict('stored'));

		// Once it's gone, the file can be uploaded again.
		await deleteMarked(db, store.bucket);
		expect(objects.size).toBe(0);
		await uploadFile(db, store, admin, posted.id, file, new Uint8Array(8));
		await postNotice(db, admin, { ...posted, files: [file] });
		expect(objects.size).toBe(1);
	});

	it('lose their files with their classroom or their days, and files never posted a day later', async () => {
		const db = localDatabase();
		const { store, objects } = localStore();
		const { admin } = await setUpKindergarten(db);
		const [bubbles, owls] = [await addClassroomTo(db, admin), await addClassroomTo(db, admin)];
		const notices = [notice([owls]), notice([bubbles], 1), notice([bubbles, owls])];
		const files = notices.map(() => createId());
		vi.useFakeTimers({ toFake: ['Date'] });
		try {
			vi.setSystemTime(1_000_000);
			for (const [index, posted] of notices.entries()) {
				await uploadFile(db, store, admin, posted.id, files[index], new Uint8Array(8));
				await postNotice(db, admin, { ...posted, files: [files[index]] });
			}
			// A file uploaded for a notice that was never posted.
			await uploadFile(db, store, admin, createId(), createId(), new Uint8Array(8));
			expect(objects.size).toBe(4);

			// Deleting Owls deletes the notice for it alone, with its file; the shared notice keeps its own.
			await deleteClassroom(db, store.bucket, admin, owls);
			expect(objects.has(`notices/${notices[0].id}/${files[0]}`)).toBe(false);
			expect(objects.size).toBe(3);

			// A day on, the daily cleanup deletes the notice past its days, and the file no notice named.
			vi.setSystemTime(1_000_000 + day + 1);
			await cleanUp({ DB: db, FILES: store.bucket });
			expect([...objects.keys()]).toEqual([`notices/${notices[2].id}/${files[2]}`]);
		} finally {
			vi.useRealTimers();
		}
	});
});

describe('board photos', () => {
	const photo = (value: number) => new Uint8Array(64).fill(value);

	it('go up in a teacher’s own classrooms in place of the photo there, for that classroom only', async () => {
		const db = localDatabase();
		const { store, objects } = localStore();
		const { admin } = await setUpKindergarten(db);
		const [bubbles, owls] = [await addClassroomTo(db, admin), await addClassroomTo(db, admin)];
		const [inBubbles, inOwls] = [newFamily(), newFamily()];
		await addChildTo(db, admin, bubbles, inBubbles);
		await addChildTo(db, admin, owls, inOwls);
		const teacher = await addTeacherTo(db, admin, [bubbles]);
		const [first, second] = [createId(), createId()];

		await expect(
			putUpPhoto(db, store, teacher, owls, first, photo(1), 'details')
		).rejects.toMatchObject(conflict('stale'));
		expect(await putUpPhoto(db, store, teacher, bubbles, first, photo(1), 'details')).toMatchObject(
			[{ id: first, classroom: bubbles, details: 'details' }]
		);
		// A photo whose bytes are stored already isn't put up again, and stays up.
		await expect(
			putUpPhoto(db, store, teacher, bubbles, first, photo(9), 'other details')
		).rejects.toMatchObject(conflict('stored'));
		expect([...objects.keys()]).toEqual([`board/${bubbles}/${first}`]);
		// A new photo takes its place, with its own details, in the database and in R2.
		expect(
			await putUpPhoto(db, store, teacher, bubbles, second, photo(2), 'new details')
		).toMatchObject([{ id: second, classroom: bubbles, details: 'new details' }]);
		expect([...objects.keys()]).toEqual([`board/${bubbles}/${second}`]);
		expect(await storedBytes(db)).toBe(64);

		const [family, other] = [await familyOf(db, inBubbles), await familyOf(db, inOwls)];
		expect(await boardPhotos(db, family)).toMatchObject([{ id: second }]);
		expect(await boardPhotos(db, other)).toEqual([]);
		expect(await read(await photoBytes(db, store, family, bubbles, second))).toEqual(photo(2));
		for (const [viewer, id] of [
			[other, second],
			[family, first]
		] as const) {
			await expect(photoBytes(db, store, viewer, bubbles, id)).rejects.toMatchObject({
				status: 404
			});
		}
	});

	it('come down for their classroom’s teachers and admins, and go with their classroom', async () => {
		const db = localDatabase();
		const { store, objects } = localStore();
		const { admin } = await setUpKindergarten(db);
		const [bubbles, owls] = [await addClassroomTo(db, admin), await addClassroomTo(db, admin)];
		const teacher = await addTeacherTo(db, admin, [bubbles]);
		const [inBubbles, inOwls] = [createId(), createId()];
		await putUpPhoto(db, store, admin, bubbles, inBubbles, photo(1), 'details');
		await putUpPhoto(db, store, admin, owls, inOwls, photo(2), 'details');

		await expect(takeDownPhoto(db, store.bucket, teacher, owls, inOwls)).rejects.toMatchObject(
			conflict('stale')
		);
		expect(await takeDownPhoto(db, store.bucket, teacher, bubbles, inBubbles)).toEqual([]);
		await expect(takeDownPhoto(db, store.bucket, admin, bubbles, inBubbles)).rejects.toMatchObject({
			status: 404
		});
		await deleteClassroom(db, store.bucket, admin, owls);
		expect(await boardPhotos(db, admin)).toEqual([]);
		expect(objects.size).toBe(0);
		expect(await storedBytes(db)).toBe(0);
	});
});

describe('storage', () => {
	const bytes = (size: number) => new Uint8Array(size);

	it('keeps what it stores within the bytes allowed, and stores each key once', async () => {
		const db = localDatabase();
		const { store, objects } = localStore({ bytes: 100 });
		await putObject(db, store, 'a', bytes(60));
		await expect(putObject(db, store, 'b', bytes(50))).rejects.toMatchObject(
			refused('storage-full', 507)
		);
		// A key stored already keeps its bytes.
		await expect(putObject(db, store, 'a', bytes(10))).rejects.toMatchObject(conflict('stored'));
		expect(await storedBytes(db)).toBe(60);
		expect([...objects.keys()]).toEqual(['a']);
	});

	it('stops uploads and downloads for the rest of a month once each reaches its limit, or at 0', async () => {
		const db = localDatabase();
		const { store } = localStore({ uploads: 2, downloads: 1 });
		const [september, october, november] = [8, 9, 10].map((month) => Date.UTC(2026, month, 15));
		await putObject(db, store, 'a', bytes(1), september);
		await putObject(db, store, 'b', bytes(1), september);
		await expect(putObject(db, store, 'c', bytes(1), september)).rejects.toMatchObject(
			refused('upload-limit')
		);
		await putObject(db, store, 'c', bytes(1), october);
		expect(await getObject(db, store, 'a', september)).toBeDefined();
		await expect(getObject(db, store, 'a', september)).rejects.toMatchObject(
			refused('download-limit')
		);
		expect(await getObject(db, store, 'a', october)).toBeDefined();

		const off = { ...store, limits: { bytes: 100, uploads: 0, downloads: 0 } };
		await expect(putObject(db, off, 'd', bytes(1), november)).rejects.toMatchObject(
			refused('upload-limit')
		);
		await expect(getObject(db, off, 'a', november)).rejects.toMatchObject(
			refused('download-limit')
		);
	});

	it('deletes only what no record names, leftovers once a day has passed, and deletions that didn’t finish', async () => {
		const db = localDatabase();
		const { store, objects } = localStore();
		const { admin } = await setUpKindergarten(db);
		const bubbles = await addClassroomTo(db, admin);
		const photo = createId();
		await putUpPhoto(db, store, admin, bubbles, photo, bytes(10), 'details', 1_000);
		// Uploads whose records never came, or are still on their way, and a deletion that stopped midway.
		await putObject(db, store, 'left/over', bytes(10), 1_000);
		await putObject(db, store, 'on/its/way', bytes(10), 5_000);
		await putObject(db, store, 'half/deleted', bytes(10), 5_000);
		await db.prepare("UPDATE stored_objects SET deleting = 1 WHERE key = 'half/deleted'").run();

		await cleanUp({ DB: db, FILES: store.bucket }, 2_000 + day);
		expect([...objects.keys()].sort()).toEqual([`board/${bubbles}/${photo}`, 'on/its/way'].sort());
		expect(await storedBytes(db)).toBe(20);
	});
});

describe('notifications', () => {
	const endpoint = (name: string | number) => `https://fcm.googleapis.com/fcm/send/${name}`;
	const turnOn = async (db: D1Database, device: RequestEvent, name: string | number) =>
		subscribe(db, endpoint(name), (await sessionHash(device))!);
	const subscribed = async (db: D1Database) => {
		const { results } = await db
			.prepare('SELECT endpoint FROM push_subscriptions ORDER BY endpoint')
			.all<{ endpoint: string }>();
		return results.map((row) => row.endpoint);
	};

	it('reach the families and teachers of a notice’s classrooms, except the device that posted it', async () => {
		const db = localDatabase();
		const { teachers, admin } = await setUpKindergarten(db);
		const [bubbles, owls] = [await addClassroomTo(db, admin), await addClassroomTo(db, admin)];
		const [inBubbles, inOwls] = [newFamily(), newFamily()];
		await addChildTo(db, admin, bubbles, inBubbles);
		await addChildTo(db, admin, owls, inOwls);
		const teacher = await addTeacherTo(db, admin, [bubbles]);
		const poster = await deviceWith(db, teacher.credential);
		for (const [name, device] of [
			['family', await deviceWith(db, inBubbles.credential.id)],
			['other-family', await deviceWith(db, inOwls.credential.id)],
			['teacher', await deviceWith(db, teacher.credential)],
			['poster', poster],
			['unassigned-admin', await deviceWith(db, teachers[0].credential.id)]
		] as const) {
			await turnOn(db, device, name);
		}

		const reached = await recipients(db, [bubbles], await sessionHash(poster));
		expect(reached.sort()).toEqual([endpoint('family'), endpoint('teacher')]);
	});

	it('end with their session: signing out, a replaced card, or a session that ran out', async () => {
		const db = localDatabase();
		const { teachers, admin } = await setUpKindergarten(db);
		const bubbles = await addClassroomTo(db, admin);
		const family = newFamily();
		await addChildTo(db, admin, bubbles, family);
		const [familyDevice, adminDevice, laterDevice] = [
			await deviceWith(db, family.credential.id),
			await deviceWith(db, teachers[0].credential.id),
			await deviceWith(db, teachers[1].credential.id)
		];
		await turnOn(db, familyDevice, 'family');
		await turnOn(db, adminDevice, 'admin');
		await turnOn(db, laterDevice, 'later');

		await replaceFamilyCards(db, admin, [{ family: family.id, credential: credential() }]);
		await endSession(adminDevice);
		expect(await subscribed(db)).toEqual([endpoint('later')]);
		await db.prepare('UPDATE sessions SET expires_at = 0').run();
		await cleanUp({ DB: db, FILES: localStore().store.bucket });
		expect(await subscribed(db)).toEqual([]);
	});

	it('send a group once, forget devices that are gone, and try busy push services again later', async () => {
		const db = localDatabase();
		const { teachers } = await setUpKindergarten(db);
		const device = await deviceWith(db, teachers[0].credential.id);
		const statuses = [201, 400, 404, 410, 429, 503];
		for (const status of statuses) await turnOn(db, device, status);
		const requests: { url: string; headers: HeadersInit | undefined }[] = [];
		const queued: unknown[] = [];
		let acknowledged = false;
		// Each fake push service answers with the status its endpoint ends in.
		const fetcher = async (url: RequestInfo | URL, init?: RequestInit) => {
			requests.push({ url: String(url), headers: init?.headers });
			return new Response(null, { status: Number(String(url).split('/').pop()) });
		};
		const subject = 'https://bubbleboard.example.com';
		const body: PushMessage = { endpoints: statuses.map(endpoint), subject, attempt: 0 };
		const batch = { messages: [{ body, ack: () => (acknowledged = true) }] };
		const env = {
			DB: db,
			VAPID_KEY: await createVapidSecret(),
			NOTIFICATIONS: { send: async (...args: unknown[]) => void queued.push(args) }
		};

		await deliver(
			batch as unknown as MessageBatch<PushMessage>,
			env as unknown as PushEnv,
			fetcher as typeof fetch
		);
		expect(requests.map(({ url }) => url)).toEqual(statuses.map(endpoint));
		expect(requests[0].headers).toMatchObject({ TTL: '86400', Topic: 'notice' });
		expect(await subscribed(db)).toEqual([201, 400, 429, 503].map(endpoint));
		expect(queued).toEqual([
			[{ endpoints: [endpoint(429), endpoint(503)], subject, attempt: 1 }, { delaySeconds: 60 }]
		]);
		expect(acknowledged).toBe(true);
	});
});
