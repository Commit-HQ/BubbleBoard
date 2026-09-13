import { readdirSync, readFileSync } from 'node:fs';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import type { RequestEvent } from '@sveltejs/kit';
import { describe, expect, it, vi } from 'vitest';
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
	replaceFamilyCards,
	replaceTeacherCard,
	setUp
} from './catalog';
import { day } from '$lib/notices';
import { board, changeNotice, deleteNotice, postNotice } from './notices';
import {
	cleanUp,
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
	const notice = (classrooms: string[], days = 30) => ({
		id: createId(),
		content: 'content',
		days,
		classrooms: keys(classrooms)
	});
	const change = (classrooms: string[], announce = false) => ({
		content: 'changed',
		days: 30,
		announce,
		classrooms: keys(classrooms)
	});
	const ids = (records: { id: string }[]) => records.map(({ id }) => id);
	const count = async (db: D1Database) =>
		(await db.prepare('SELECT COUNT(*) AS count FROM notices').first<{ count: number }>())?.count;

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

		await expect(changeNotice(db, colleague, posted.id, change([bubbles]))).rejects.toMatchObject({
			status: 403
		});
		await expect(deleteNotice(db, colleague, posted.id)).rejects.toMatchObject({ status: 403 });
		expect(await changeNotice(db, author, posted.id, change([bubbles]))).toMatchObject([
			{ id: posted.id, content: 'changed', editedAt: expect.any(Number) }
		]);

		await removeTeacher(db, admin, author.teacher);
		expect(await board(db, admin)).toMatchObject([{ id: posted.id, teacher: null }]);
		await expect(deleteNotice(db, author, posted.id)).rejects.toMatchObject({ status: 403 });
		expect(await deleteNotice(db, admin, posted.id)).toEqual([]);
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
			expect(ids(await changeNotice(db, admin, first.id, change([bubbles])))).toEqual([
				second.id,
				first.id
			]);
			vi.setSystemTime(4_000_000);
			expect(ids(await changeNotice(db, admin, first.id, change([bubbles], true)))).toEqual([
				first.id,
				second.id
			]);

			// A day after it was posted, the second notice is off every board, and the daily cleanup deletes it.
			vi.setSystemTime(2_000_000 + day);
			expect(ids(await board(db, admin))).toEqual([first.id]);
			expect(await count(db)).toBe(2);
			await cleanUp(db);
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

		await deleteClassroom(db, admin, owls);
		expect(await board(db, admin)).toMatchObject([{ id: shared.id, classrooms: keys([bubbles]) }]);
		expect(await count(db)).toBe(1);
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
		await cleanUp(db);
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
