import { localDatabase, localStore, migrate } from './test-database';
import type { RequestEvent } from '@sveltejs/kit';
import { describe, expect, it, vi } from 'vitest';
import type {
	FamilyIdentity,
	FamilyLinks,
	Identity,
	NewCredential,
	NewFamily,
	Staff,
	StaffRole
} from '$lib/api';
import { toBase64Url } from '$lib/base64url';
import { createId } from '$lib/crypto';
import {
	accessFor,
	addChild,
	addClassroom,
	addOneTimeCard,
	addTeacher,
	changeChild,
	changeTeacher,
	deleteClassroom,
	kindergarten,
	removeChild,
	removeTeacher,
	renameFamily,
	replaceFamilyCards,
	replaceTeacherCard,
	setUp
} from './catalog';
import { day } from '$lib/notices';
import { cleanUp } from './cleanup';
import { maxInfoPages } from '$lib/info';
import {
	addInfoPage,
	changeInfoPage,
	deleteInfoPage,
	infoFileBytes,
	orderInfoPages,
	uploadInfoFile
} from './info';
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
	setMutedClassrooms,
	subscribe,
	type PushEnv,
	type PushMessage
} from './push';
import {
	endSession,
	familyDevices,
	identityForCard,
	nameDevice,
	removeDevice,
	requireHead,
	requireIdentity,
	requireManager,
	requireStaff,
	sessionHash,
	startSession,
	type Head,
	type Manager
} from './session';
import { deleteMarked, getObject, putObject } from './storage';

// The database boundary on the real migrations: who can read and change what. Profiles and keys are
// placeholders, because the server never opens them.

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

/** A set-up installation: its head and recovery teachers, and the head as a checked session gives it. */
async function setUpKindergarten(db: D1Database) {
	const teachers = setupTeachers();
	await setUp(db, teachers);
	const head = (await identityForCard(db, teachers[0].credential.authToken)) as Head;
	return { teachers, head };
}

async function revision(db: D1Database) {
	const row = await db.prepare('SELECT revision FROM installation').first<{ revision: number }>();
	return row?.revision ?? 0;
}

/** A classroom as a head device adds one, with a copy of the Info Key once the kindergarten has one. */
async function addClassroomTo(db: D1Database, head: Head, infoKey?: string) {
	const id = createId();
	const classroom = { id, profile: 'profile', groupKeyForStaff: 'wrapped key' };
	await addClassroom(db, head, infoKey === undefined ? classroom : { ...classroom, infoKey });
	return id;
}

/** A staff member as the head's device adds one, in a role of her own. */
async function addTeacherTo(
	db: D1Database,
	head: Head,
	classrooms: string[],
	role: StaffRole = 'teacher'
): Promise<Staff> {
	const teacher = {
		id: createId(),
		role,
		profile: 'profile',
		classrooms,
		credential: credential()
	};
	await addTeacher(db, head, teacher);
	const { id, wrappedKey } = teacher.credential;
	return { kind: 'staff', credential: id, wrappedKey, teacher: teacher.id, role };
}

/** Family links as a head device works them out for a change. */
async function links(db: D1Database, change: Partial<FamilyLinks>): Promise<FamilyLinks> {
	const none = { newFamilies: [], addMemberships: [], removeMemberships: [], removeFamilies: [] };
	return { revision: await revision(db), ...none, ...change };
}

/** A child as a managing device adds one: with a new family card, or with an existing family's. */
async function addChildTo(
	db: D1Database,
	manager: Manager,
	classroom: string,
	family: NewFamily | string
) {
	const id = createId();
	const familyId = typeof family === 'string' ? family : family.id;
	await addChild(db, manager, {
		id,
		classroom,
		meetingFamilies: [familyId],
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
	it('see their own classrooms, with the children and families in them; heads see everything', async () => {
		const db = localDatabase();
		const { head } = await setUpKindergarten(db);
		const [bubbles, owls] = [await addClassroomTo(db, head), await addClassroomTo(db, head)];
		const [inBubbles, inOwls] = [newFamily(), newFamily()];
		const child = await addChildTo(db, head, bubbles, inBubbles);
		await addChildTo(db, head, owls, inOwls);
		const teacher = await addTeacherTo(db, head, [bubbles]);

		const seen = await kindergarten(db, teacher);
		expect(seen.classrooms.map(({ id }) => id)).toEqual([bubbles]);
		expect(seen.children.map(({ id }) => id)).toEqual([child]);
		expect(seen.families).toMatchObject([{ id: inBubbles.id, classrooms: [bubbles] }]);
		expect(seen.teachers).toMatchObject([
			{ id: teacher.teacher, role: 'teacher', classrooms: [bubbles] }
		]);

		const everything = await kindergarten(db, head);
		expect(everything.classrooms).toHaveLength(2);
		expect(everything.teachers).toHaveLength(3);
		expect(everything.families.map(({ id }) => id).sort()).toEqual(
			[inBubbles.id, inOwls.id].sort()
		);
	});

	it('see that a family reaches another classroom, and nothing about what is in it', async () => {
		const db = localDatabase();
		const { head } = await setUpKindergarten(db);
		const [bubbles, owls] = [await addClassroomTo(db, head), await addClassroomTo(db, head)];
		const family = newFamily();
		await addChildTo(db, head, bubbles, family);
		const sister = await addChildTo(db, head, owls, family.id);
		const teacher = await addTeacherTo(db, head, [bubbles]);

		// The other classroom's ID comes along so the device plans the family's links without undoing it,
		// and can say the family's card reaches further. It opens neither the classroom nor its children.
		const seen = await kindergarten(db, teacher);
		expect(seen.families).toHaveLength(1);
		expect(seen.families[0].classrooms.toSorted()).toEqual([bubbles, owls].toSorted());
		expect(seen.classrooms.map(({ id }) => id)).toEqual([bubbles]);
		expect(seen.children).toHaveLength(1);
		expect(JSON.stringify(seen)).not.toContain(sister);
	});

	it('let the head and a lead of the family’s classrooms replace family cards, which ends the old cards', async () => {
		const db = localDatabase();
		const { head } = await setUpKindergarten(db);
		const [bubbles, owls] = [await addClassroomTo(db, head), await addClassroomTo(db, head)];
		const [first, second, inOwls] = [newFamily(), newFamily(), newFamily()];
		await addChildTo(db, head, bubbles, first);
		await addChildTo(db, head, bubbles, second);
		await addChildTo(db, head, owls, inOwls);
		const lead = (await addTeacherTo(db, head, [bubbles], 'lead')) as Manager;
		const newCards = (...families: NewFamily[]) =>
			families.map(({ id }) => ({ family: id, credential: credential() }));

		// A family outside the lead's classrooms stops the whole change.
		await expect(replaceFamilyCards(db, lead, newCards(first, inOwls))).rejects.toMatchObject({
			status: 404
		});
		expect(await identityForCard(db, first.credential.authToken)).toMatchObject({
			family: first.id
		});

		const cards = newCards(first, second);
		await replaceFamilyCards(db, lead, cards);
		for (const [index, family] of [first, second].entries()) {
			expect(await identityForCard(db, family.credential.authToken)).toBeUndefined();
			expect(await identityForCard(db, cards[index].credential.authToken)).toMatchObject({
				kind: 'family',
				family: family.id
			});
		}
		await expect(replaceFamilyCards(db, head, newCards(inOwls))).resolves.toBeUndefined();
	});
});

describe('the roles migration', () => {
	it('makes every admin a head, mutes the classrooms she didn’t teach, and frees her of them', async () => {
		const db = localDatabase('0023');
		const [head, teacher] = [createId(), createId()];
		const [bubbles, owls, ladybirds] = [createId(), createId(), createId()];
		await db.prepare('INSERT INTO installation (id, set_up_at) VALUES (1, 0)').run();
		for (const id of [bubbles, owls, ladybirds]) {
			await db
				.prepare('INSERT INTO classrooms (id, profile, group_key_for_staff) VALUES (?, ?, ?)')
				.bind(id, 'profile', 'wrapped key')
				.run();
		}
		for (const [id, admin] of [
			[head, 1],
			[teacher, 0]
		] as const) {
			await db
				.prepare('INSERT INTO teachers (id, admin, profile) VALUES (?, ?, ?)')
				.bind(id, admin, 'profile')
				.run();
		}
		for (const [id, classroom] of [
			[head, bubbles],
			[head, owls],
			[teacher, bubbles]
		]) {
			await db
				.prepare('INSERT INTO teacher_classrooms (teacher_id, classroom_id) VALUES (?, ?)')
				.bind(id, classroom)
				.run();
		}

		migrate(db);

		const rows = async (sql: string) => (await db.prepare(sql).all()).results;
		expect(await rows('SELECT id, role FROM teachers ORDER BY role')).toEqual([
			{ id: head, role: 'head' },
			{ id: teacher, role: 'teacher' }
		]);
		// She heard only about Bubbles and Owls, so Ladybirds, which she didn't teach, starts muted.
		expect(await rows('SELECT teacher_id, classroom_id FROM teacher_muted_classrooms')).toEqual([
			{ teacher_id: head, classroom_id: ladybirds }
		]);
		expect(await rows('SELECT teacher_id, classroom_id FROM teacher_classrooms')).toEqual([
			{ teacher_id: teacher, classroom_id: bubbles }
		]);
	});
});

describe('group leads', () => {
	/** Two classrooms, and a lead who holds only Bubbles. */
	async function withLead(db: D1Database) {
		const { head } = await setUpKindergarten(db);
		const [bubbles, owls] = [await addClassroomTo(db, head), await addClassroomTo(db, head)];
		const lead = (await addTeacherTo(db, head, [bubbles], 'lead')) as Manager;
		return { head, bubbles, owls, lead };
	}

	it('see their classrooms with the children, families and staff in them, and nothing else', async () => {
		const db = localDatabase();
		const { head, bubbles, owls, lead } = await withLead(db);
		const family = newFamily();
		const child = await addChildTo(db, head, bubbles, family);
		await addChildTo(db, head, owls, family.id);
		const colleague = await addTeacherTo(db, head, [bubbles]);
		await addTeacherTo(db, head, [owls]);

		const seen = await kindergarten(db, lead);
		expect(seen.classrooms.map(({ id }) => id)).toEqual([bubbles]);
		expect(seen.children.map(({ id }) => id)).toEqual([child]);
		expect(seen.families).toMatchObject([{ id: family.id }]);
		expect(seen.families[0].classrooms.toSorted()).toEqual([bubbles, owls].toSorted());
		expect(seen.teachers.map(({ id }) => id).sort()).toEqual(
			[lead.teacher, colleague.teacher].sort()
		);
	});

	it('add a child to a classroom they hold, and to no other', async () => {
		const db = localDatabase();
		const { bubbles, owls, lead } = await withLead(db);
		await expect(addChildTo(db, lead, bubbles, newFamily())).resolves.toEqual(expect.any(String));
		await expect(addChildTo(db, lead, owls, newFamily())).rejects.toMatchObject(conflict('stale'));
	});

	it('leave a family the other group keeps, which only the head removes', async () => {
		const db = localDatabase();
		const { head, bubbles, owls, lead } = await withLead(db);
		const family = newFamily();
		const inBubbles = await addChildTo(db, head, bubbles, family);
		const inOwls = await addChildTo(db, head, owls, family.id);

		// The lead takes her classroom's child out. Even asked to, the server keeps the family: its card
		// is still the other group's.
		const leaving = { family: family.id, classroom: bubbles };
		await removeChild(
			db,
			lead,
			inBubbles,
			await links(db, { removeMemberships: [leaving], removeFamilies: [family.id] })
		);
		expect(await identityForCard(db, family.credential.authToken)).toMatchObject({
			family: family.id
		});
		expect((await kindergarten(db, head)).families).toMatchObject([
			{ id: family.id, classrooms: [owls] }
		]);

		await removeChild(
			db,
			head,
			inOwls,
			await links(db, {
				removeMemberships: [{ family: family.id, classroom: owls }],
				removeFamilies: [family.id]
			})
		);
		expect(await identityForCard(db, family.credential.authToken)).toBeUndefined();
	});

	it('rename a family with a child in their classrooms, and no other', async () => {
		const db = localDatabase();
		const { head, bubbles, owls, lead } = await withLead(db);
		const [mine, theirs] = [newFamily(), newFamily()];
		await addChildTo(db, head, bubbles, mine);
		await addChildTo(db, head, owls, theirs);

		await expect(renameFamily(db, lead, mine.id, 'renamed')).resolves.toMatchObject({
			families: [{ id: mine.id, profile: 'renamed' }]
		});
		await expect(renameFamily(db, lead, theirs.id, 'renamed')).rejects.toMatchObject({
			status: 404
		});
	});

	it('change a notice whose classrooms are all theirs, and no notice that also goes elsewhere', async () => {
		const db = localDatabase();
		const { bucket } = localStore().store;
		const { head, bubbles, owls, lead } = await withLead(db);
		const teacher = await addTeacherTo(db, head, [bubbles]);
		const keys = (classrooms: string[]) =>
			classrooms.map((classroom) => ({ classroom, noticeKey: 'wrapped key' }));
		const notice = (classrooms: string[]) => ({
			id: createId(),
			content: 'content',
			days: 30,
			poll: false,
			counts: false,
			classrooms: keys(classrooms),
			files: []
		});
		const [hers, shared] = [notice([bubbles]), notice([bubbles, owls])];
		await postNotice(db, teacher, hers);
		await postNotice(db, head, shared);
		const change = (classrooms: string[]) => ({
			content: 'changed',
			days: 30,
			announce: false,
			poll: false,
			counts: false,
			classrooms: keys(classrooms),
			files: []
		});

		const board = await changeNotice(db, bucket, lead, hers.id, change([bubbles]));
		expect(board.find(({ id }) => id === hers.id)).toMatchObject({
			content: 'changed',
			elsewhere: false
		});
		// Her device gets the shared notice's key for Bubbles alone, so the server says it goes further.
		expect(board.find(({ id }) => id === shared.id)).toMatchObject({ elsewhere: true });
		await expect(
			changeNotice(db, bucket, lead, shared.id, change([bubbles]))
		).rejects.toMatchObject({ status: 403 });
		const colleague = await addTeacherTo(db, head, [bubbles]);
		await expect(
			changeNotice(db, bucket, colleague, hers.id, change([bubbles]))
		).rejects.toMatchObject({ status: 403 });
	});

	it('are refused the pages only the head keeps: classrooms, teachers, and the kindergarten’s info', async () => {
		const db = localDatabase();
		const { lead } = await withLead(db);
		const device = await deviceWith(db, lead.credential);
		await expect(requireHead(device)).rejects.toMatchObject({ status: 403 });
		await expect(requireManager(device)).resolves.toMatchObject({ role: 'lead' });
	});
});

describe('sessions', () => {
	it('let a card do only what its owner may', async () => {
		const db = localDatabase();
		const { teachers, head } = await setUpKindergarten(db);
		const bubbles = await addClassroomTo(db, head);
		const family = newFamily();
		await addChildTo(db, head, bubbles, family);
		const teacher = await addTeacherTo(db, head, [bubbles]);

		await expect(
			requireHead(await deviceWith(db, teachers[0].credential.id))
		).resolves.toMatchObject({
			role: 'head'
		});
		const asTeacher = await deviceWith(db, teacher.credential);
		await expect(requireStaff(asTeacher)).resolves.toMatchObject({ teacher: teacher.teacher });
		await expect(requireHead(asTeacher)).rejects.toMatchObject({ status: 403 });
		await expect(requireStaff(await deviceWith(db, family.credential.id))).rejects.toMatchObject({
			status: 403
		});
		await expect(requireStaff(requestTo(db))).rejects.toMatchObject({ status: 401 });
	});

	it('end when their card is replaced or its owner removed, or after they run out', async () => {
		const db = localDatabase();
		const { teachers, head } = await setUpKindergarten(db);
		const bubbles = await addClassroomTo(db, head);
		const [family, leaving] = [newFamily(), newFamily()];
		await addChildTo(db, head, bubbles, family);
		const child = await addChildTo(db, head, bubbles, leaving);
		const [teacher, former] = [
			await addTeacherTo(db, head, [bubbles]),
			await addTeacherTo(db, head, [bubbles])
		];
		const headDevice = await deviceWith(db, teachers[0].credential.id);
		const devices = [
			await deviceWith(db, teacher.credential),
			await deviceWith(db, family.credential.id),
			await deviceWith(db, former.credential),
			await deviceWith(db, leaving.credential.id)
		];

		await replaceTeacherCard(db, head, teacher.teacher, credential());
		await replaceFamilyCards(db, head, [{ family: family.id, credential: credential() }]);
		await removeTeacher(db, head, former.teacher);
		await removeChild(db, head, child, await links(db, { removeFamilies: [leaving.id] }));
		for (const device of devices) {
			await expect(requireIdentity(device)).rejects.toMatchObject({ status: 401 });
		}

		// Other devices stay connected until their sessions run out.
		await expect(requireHead(headDevice)).resolves.toMatchObject({ role: 'head' });
		await db.prepare('UPDATE sessions SET expires_at = 0').run();
		await expect(requireHead(headDevice)).rejects.toMatchObject({ status: 401 });
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

describe('one-time cards', () => {
	it('connect one device of their family, once, before their day is up, and it stays connected', async () => {
		const db = localDatabase();
		const { head } = await setUpKindergarten(db);
		const bubbles = await addClassroomTo(db, head);
		const family = newFamily();
		await addChildTo(db, head, bubbles, family);
		const [card, late] = [credential(), credential()];
		const until = await addOneTimeCard(db, await familyOf(db, family), card);
		expect(until).toBeGreaterThan(Date.now() + day - 60_000);

		expect(await identityForCard(db, card.authToken)).toMatchObject({
			kind: 'family',
			family: family.id,
			credential: card.id
		});
		await expect(identityForCard(db, card.authToken)).rejects.toMatchObject(
			refused('ended-card', 401)
		);
		await addOneTimeCard(db, await familyOf(db, family), late, Date.now() - day);
		await expect(identityForCard(db, late.authToken)).rejects.toMatchObject(
			refused('ended-card', 401)
		);

		// Its device stays connected until the family's card is replaced, which ends the rest too.
		const device = await deviceWith(db, card.id);
		await expect(requireIdentity(device)).resolves.toMatchObject({ family: family.id });
		await replaceFamilyCards(db, head, [{ family: family.id, credential: credential() }]);
		await expect(requireIdentity(device)).rejects.toMatchObject({ status: 401 });
		expect(await identityForCard(db, late.authToken)).toBeUndefined();
	});

	it('wait five at most for each family, and go in the cleanup once they can’t connect and connected none still signed in', async () => {
		const db = localDatabase();
		const { head } = await setUpKindergarten(db);
		const bubbles = await addClassroomTo(db, head);
		const [family, other] = [newFamily(), newFamily()];
		await addChildTo(db, head, bubbles, family);
		await addChildTo(db, head, bubbles, other);
		const ids = async (where: string, ...params: number[]) => {
			const { results } = await db
				.prepare(`SELECT id FROM credentials WHERE ${where}`)
				.bind(...params)
				.all<{ id: string }>();
			return results.map(({ id }) => id).sort();
		};
		const now = Date.now();
		const cards = Array.from({ length: 6 }, () => credential());
		for (const [index, card] of cards.entries()) {
			await addOneTimeCard(db, await familyOf(db, family), card, now + index);
		}
		const otherCard = credential();
		await addOneTimeCard(db, await familyOf(db, other), otherCard, now);

		// The sixth ended the oldest, and another family's waits on.
		const waiting = [...cards.slice(1), otherCard].map(({ id }) => id).sort();
		expect(await ids('connects_until > ?', now + cards.length)).toEqual(waiting);
		await expect(identityForCard(db, cards[0].authToken)).rejects.toMatchObject(
			refused('ended-card', 401)
		);

		const connected = await identityForCard(db, cards[1].authToken);
		const device = await deviceWith(db, connected!.credential);
		const cleanUpLater = () => cleanUp({ DB: db, FILES: localStore().store.bucket }, now + 2 * day);
		await cleanUpLater();
		expect(await ids('connects_until IS NOT NULL')).toEqual([cards[1].id]);
		await endSession(device);
		await cleanUpLater();
		expect(await ids('connects_until IS NOT NULL')).toEqual([]);
		expect(await familyOf(db, family)).toMatchObject({ family: family.id });
	});
});

describe('a family’s devices', () => {
	it('are listed for the family alone, named by themselves, and removed by each other', async () => {
		const db = localDatabase();
		const { head } = await setUpKindergarten(db);
		const bubbles = await addClassroomTo(db, head);
		const [family, other] = [newFamily(), newFamily()];
		await addChildTo(db, head, bubbles, family);
		await addChildTo(db, head, bubbles, other);
		const card = credential();
		await addOneTimeCard(db, await familyOf(db, family), card);
		const identity = await familyOf(db, family);

		// One connected with the printed card, one with a one-time card, and another family's.
		const [mum, grandpa, stranger] = [
			await deviceWith(db, family.credential.id),
			await deviceWith(db, card.id),
			await deviceWith(db, other.credential.id)
		];
		await nameDevice(mum, 'sealed name');
		const devices = await familyDevices(mum, identity);
		expect(devices).toEqual([
			{ id: expect.any(String), name: 'sealed name', current: true },
			{ id: expect.any(String), name: null, current: false }
		]);
		expect(await familyDevices(grandpa, identity)).toEqual([
			{ ...devices[0], current: false },
			{ ...devices[1], current: true }
		]);

		// Another family removes nothing, and a removed device connects again only with a card.
		await removeDevice(stranger, await familyOf(db, other), devices[1].id);
		await expect(requireIdentity(grandpa)).resolves.toMatchObject({ family: family.id });
		await removeDevice(mum, identity, devices[1].id);
		await expect(requireIdentity(grandpa)).rejects.toMatchObject({ status: 401 });
		await expect(requireIdentity(mum)).resolves.toMatchObject({ family: family.id });
		await expect(requireIdentity(stranger)).resolves.toMatchObject({ family: other.id });
		expect(await familyDevices(mum, identity)).toEqual([devices[0]]);

		// Sessions that ran out aren't listed.
		await db.prepare('UPDATE sessions SET expires_at = 0').run();
		expect(await familyDevices(mum, identity)).toEqual([]);
	});
});

describe('the kindergarten', () => {
	it('always keeps a head', async () => {
		const db = localDatabase();
		const { teachers, head } = await setUpKindergarten(db);
		const [headTeacher, recovery] = teachers;
		await removeTeacher(db, head, recovery.id);
		await expect(removeTeacher(db, head, headTeacher.id)).rejects.toMatchObject(
			conflict('last-head')
		);
		await expect(
			changeTeacher(db, head, headTeacher.id, {
				revision: await revision(db),
				role: 'teacher',
				profile: 'profile',
				classrooms: []
			})
		).rejects.toMatchObject(conflict('last-head'));
		expect(await identityForCard(db, headTeacher.credential.authToken)).toMatchObject({
			role: 'head'
		});
		expect(await identityForCard(db, recovery.credential.authToken)).toBeUndefined();
	});

	it('keeps classrooms with children, and removes a family with its last child', async () => {
		const db = localDatabase();
		const { bucket } = localStore().store;
		const { head } = await setUpKindergarten(db);
		const bubbles = await addClassroomTo(db, head);
		const family = newFamily();
		const child = await addChildTo(db, head, bubbles, family);
		await expect(deleteClassroom(db, bucket, head, bubbles)).rejects.toMatchObject(
			conflict('not-empty')
		);

		await removeChild(db, head, child, await links(db, { removeFamilies: [family.id] }));
		expect(await identityForCard(db, family.credential.authToken)).toBeUndefined();
		await expect(deleteClassroom(db, bucket, head, bubbles)).resolves.toMatchObject({
			classrooms: []
		});
	});

	it('refuses a change made from records that another change has moved on from', async () => {
		const db = localDatabase();
		const { head } = await setUpKindergarten(db);
		const [bubbles, owls, ladybirds] = [
			await addClassroomTo(db, head),
			await addClassroomTo(db, head),
			await addClassroomTo(db, head)
		];
		const family = newFamily();
		const child = await addChildTo(db, head, bubbles, family);
		await addChildTo(db, head, owls, family.id);
		const leaveBubbles = { removeMemberships: [{ family: family.id, classroom: bubbles }] };
		const move = {
			profile: 'profile',
			classroom: ladybirds,
			meetingFamilies: [family.id],
			...(await links(db, {
				...leaveBubbles,
				addMemberships: [
					{ family: family.id, classroom: ladybirds, groupKeyForFamily: 'wrapped key' }
				]
			}))
		};

		// One head takes the family card off the child in Bubbles…
		await changeChild(db, head, child, {
			profile: 'profile',
			classroom: bubbles,
			meetingFamilies: [],
			...(await links(db, leaveBubbles))
		});
		// …while another, working from the same records, moves the child with the card to Ladybirds.
		await expect(changeChild(db, head, child, move)).rejects.toMatchObject(conflict('stale'));
		const { families } = await kindergarten(db, head);
		expect(families).toMatchObject([{ id: family.id, classrooms: [owls] }]);
	});

	it('refuses a teacher change from an outdated form, so it can’t give back what was taken away', async () => {
		const db = localDatabase();
		const { head } = await setUpKindergarten(db);
		const bubbles = await addClassroomTo(db, head);
		const { teacher } = await addTeacherTo(db, head, [bubbles]);
		const read = { revision: await revision(db), role: 'teacher' as const, classrooms: [bubbles] };

		// One head takes the teacher out of Bubbles…
		await changeTeacher(db, head, teacher, { ...read, profile: 'profile', classrooms: [] });
		// …while another, with the teacher's page open from before, corrects the name.
		await expect(
			changeTeacher(db, head, teacher, { ...read, profile: 'corrected' })
		).rejects.toMatchObject(conflict('stale'));
		const { teachers } = await kindergarten(db, head);
		expect(teachers).toContainEqual({
			id: teacher,
			role: 'teacher',
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

	it('go to a teacher’s own classrooms, or any for a head', async () => {
		const db = localDatabase();
		const { head } = await setUpKindergarten(db);
		const [bubbles, owls] = [await addClassroomTo(db, head), await addClassroomTo(db, head)];
		const teacher = await addTeacherTo(db, head, [bubbles]);

		await expect(postNotice(db, teacher, notice([bubbles, owls]))).rejects.toMatchObject(
			conflict('stale')
		);
		const own = notice([bubbles]);
		expect(ids(await postNotice(db, teacher, own))).toEqual([own.id]);
		const elsewhere = notice([owls]);
		expect(ids(await postNotice(db, head, elsewhere)).sort()).toEqual(
			[own.id, elsewhere.id].sort()
		);
		expect(ids(await board(db, teacher))).toEqual([own.id]);
	});

	it('reach each family once, with the keys of its own classrooms only', async () => {
		const db = localDatabase();
		const { head } = await setUpKindergarten(db);
		const [bubbles, owls, ladybirds] = [
			await addClassroomTo(db, head),
			await addClassroomTo(db, head),
			await addClassroomTo(db, head)
		];
		const [both, owlsOnly, elsewhere] = [newFamily(), newFamily(), newFamily()];
		await addChildTo(db, head, bubbles, both);
		await addChildTo(db, head, owls, both.id);
		await addChildTo(db, head, owls, owlsOnly);
		await addChildTo(db, head, ladybirds, elsewhere);
		await postNotice(db, head, notice([bubbles, owls]));
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

	it('change and delete for their author and heads, and a removed teacher’s for heads', async () => {
		const db = localDatabase();
		const { head } = await setUpKindergarten(db);
		const bubbles = await addClassroomTo(db, head);
		const [author, colleague] = [
			await addTeacherTo(db, head, [bubbles]),
			await addTeacherTo(db, head, [bubbles])
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

		await removeTeacher(db, head, author.teacher);
		expect(await board(db, head)).toMatchObject([{ id: posted.id, teacher: null }]);
		await expect(deleteNotice(db, bucket, author, posted.id)).rejects.toMatchObject({
			status: 403
		});
		expect(await deleteNotice(db, bucket, head, posted.id)).toEqual([]);
		expect(await count(db)).toBe(0);
	});

	it('go back to the top when a change announces them, and leave when their days are up', async () => {
		const db = localDatabase();
		const { head } = await setUpKindergarten(db);
		const bubbles = await addClassroomTo(db, head);
		const [first, second] = [notice([bubbles]), notice([bubbles], 1)];
		vi.useFakeTimers({ toFake: ['Date'] });
		try {
			vi.setSystemTime(1_000_000);
			await postNotice(db, head, first);
			vi.setSystemTime(2_000_000);
			expect(ids(await postNotice(db, head, second))).toEqual([second.id, first.id]);
			vi.setSystemTime(3_000_000);
			expect(ids(await changeNotice(db, bucket, head, first.id, change([bubbles])))).toEqual([
				second.id,
				first.id
			]);
			vi.setSystemTime(4_000_000);
			expect(ids(await changeNotice(db, bucket, head, first.id, change([bubbles], true)))).toEqual([
				first.id,
				second.id
			]);

			// A day after it was posted, the second notice is off every board, and the daily cleanup deletes it.
			vi.setSystemTime(2_000_000 + day);
			expect(ids(await board(db, head))).toEqual([first.id]);
			expect(await count(db)).toBe(2);
			await cleanUp({ DB: db, FILES: bucket });
			expect(await count(db)).toBe(1);
		} finally {
			vi.useRealTimers();
		}
	});

	it('go with the last of their classrooms', async () => {
		const db = localDatabase();
		const { head } = await setUpKindergarten(db);
		const [bubbles, owls] = [await addClassroomTo(db, head), await addClassroomTo(db, head)];
		const shared = notice([bubbles, owls]);
		await postNotice(db, head, shared);
		await postNotice(db, head, notice([owls]));

		await deleteClassroom(db, bucket, head, owls);
		expect(await board(db, head)).toMatchObject([{ id: shared.id, classrooms: keys([bubbles]) }]);
		expect(await count(db)).toBe(1);
	});

	it('show who marked them as seen: a family its own mark, teachers their families’, heads every one', async () => {
		const db = localDatabase();
		const { head } = await setUpKindergarten(db);
		const [bubbles, owls, ladybirds] = [
			await addClassroomTo(db, head),
			await addClassroomTo(db, head),
			await addClassroomTo(db, head)
		];
		const [inBubbles, inOwls, elsewhere] = [newFamily(), newFamily(), newFamily()];
		await addChildTo(db, head, bubbles, inBubbles);
		await addChildTo(db, head, owls, inOwls);
		await addChildTo(db, head, ladybirds, elsewhere);
		const teacher = await addTeacherTo(db, head, [bubbles]);
		const posted = notice([bubbles, owls]);
		await postNotice(db, head, posted);
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

		expect(await seenBy(head)).toEqual([inBubbles.id, inOwls.id].sort());
		expect(await seenBy(teacher)).toEqual([inBubbles.id]);
		expect(await seenBy(await familyOf(db, inOwls))).toEqual([inOwls.id]);

		// A change keeps the marks, unless it notifies everyone again.
		await changeNotice(db, bucket, head, posted.id, change([bubbles, owls]));
		expect(await seenBy(head)).toHaveLength(2);
		await changeNotice(db, bucket, head, posted.id, change([bubbles, owls], true));
		expect(await seenBy(head)).toEqual([]);
	});

	it('take one answer from each family that sees a poll, which marks it as seen, and lose them with the poll', async () => {
		const db = localDatabase();
		const { head } = await setUpKindergarten(db);
		const [bubbles, owls] = [await addClassroomTo(db, head), await addClassroomTo(db, head)];
		const [inBubbles, inOwls] = [newFamily(), newFamily()];
		await addChildTo(db, head, bubbles, inBubbles);
		await addChildTo(db, head, owls, inOwls);
		const teacher = await addTeacherTo(db, head, [bubbles]);
		const [withPoll, withoutPoll] = [{ ...notice([bubbles]), poll: true }, notice([bubbles])];
		await postNotice(db, head, withPoll);
		await postNotice(db, head, withoutPoll);
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
		await changeNotice(db, bucket, head, withPoll.id, { ...change([bubbles]), poll: true });
		expect((await answered(head))?.votes).toHaveLength(1);
		await changeNotice(db, bucket, head, withPoll.id, change([bubbles]));
		expect((await answered(head))?.votes).toEqual([]);
		await expect(vote(db, family, withPoll.id, answer('answer'))).rejects.toMatchObject(
			conflict('stale')
		);
	});

	it('show every family a notice is for all the answers to its poll while they see its counts, and lose the answers when that changes', async () => {
		const db = localDatabase();
		const { head } = await setUpKindergarten(db);
		const [bubbles, owls, ladybirds] = [
			await addClassroomTo(db, head),
			await addClassroomTo(db, head),
			await addClassroomTo(db, head)
		];
		const [inBubbles, inOwls, inLadybirds] = [newFamily(), newFamily(), newFamily()];
		await addChildTo(db, head, bubbles, inBubbles);
		await addChildTo(db, head, owls, inOwls);
		await addChildTo(db, head, ladybirds, inLadybirds);
		const counted = { ...notice([bubbles, owls]), poll: true, counts: true };
		const elsewhere = { ...notice([ladybirds]), poll: true, counts: true };
		await postNotice(db, head, counted);
		await postNotice(db, head, elsewhere);
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
		await changeNotice(db, bucket, head, counted.id, keeping);
		expect(await votes(head)).toHaveLength(2);
		await changeNotice(db, bucket, head, counted.id, { ...keeping, counts: false });
		expect(await votes(head)).toEqual([]);
		await vote(db, ana, counted.id, answer('yes'));
		await vote(db, ivo, counted.id, answer('no'));
		expect(await votes(ivo)).toEqual([{ family: inOwls.id, choice: 'no' }]);
		expect(await votes(head)).toHaveLength(2);
	});

	it('carry the files uploaded for them, which go when a change leaves them out or the notice goes', async () => {
		const db = localDatabase();
		const { store, objects } = localStore();
		const { head } = await setUpKindergarten(db);
		const [bubbles, owls] = [await addClassroomTo(db, head), await addClassroomTo(db, head)];
		const [inBubbles, inOwls] = [newFamily(), newFamily()];
		await addChildTo(db, head, bubbles, inBubbles);
		await addChildTo(db, head, owls, inOwls);
		const [author, colleague] = [
			await addTeacherTo(db, head, [bubbles]),
			await addTeacherTo(db, head, [bubbles])
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
		const { head } = await setUpKindergarten(db);
		const bubbles = await addClassroomTo(db, head);
		const posted = notice([bubbles]);
		const file = createId();
		await uploadFile(db, store, head, posted.id, file, new Uint8Array(8));

		// A deletion has marked the file, as another change's would just before it deletes its bytes.
		await db.prepare('UPDATE stored_objects SET deleting = 1').run();
		await expect(postNotice(db, head, { ...posted, files: [file] })).rejects.toMatchObject(
			conflict('stale')
		);
		await expect(
			uploadFile(db, store, head, posted.id, file, new Uint8Array(8))
		).rejects.toMatchObject(conflict('stored'));

		// Once it's gone, the file can be uploaded again.
		await deleteMarked(db, store.bucket);
		expect(objects.size).toBe(0);
		await uploadFile(db, store, head, posted.id, file, new Uint8Array(8));
		await postNotice(db, head, { ...posted, files: [file] });
		expect(objects.size).toBe(1);
	});

	it('lose their files with their classroom or their days, and files never posted a day later', async () => {
		const db = localDatabase();
		const { store, objects } = localStore();
		const { head } = await setUpKindergarten(db);
		const [bubbles, owls] = [await addClassroomTo(db, head), await addClassroomTo(db, head)];
		const notices = [notice([owls]), notice([bubbles], 1), notice([bubbles, owls])];
		const files = notices.map(() => createId());
		vi.useFakeTimers({ toFake: ['Date'] });
		try {
			vi.setSystemTime(1_000_000);
			for (const [index, posted] of notices.entries()) {
				await uploadFile(db, store, head, posted.id, files[index], new Uint8Array(8));
				await postNotice(db, head, { ...posted, files: [files[index]] });
			}
			// A file uploaded for a notice that was never posted.
			await uploadFile(db, store, head, createId(), createId(), new Uint8Array(8));
			expect(objects.size).toBe(4);

			// Deleting Owls deletes the notice for it alone, with its file; the shared notice keeps its own.
			await deleteClassroom(db, store.bucket, head, owls);
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

describe('info pages', () => {
	/** A page as a head's device adds one. */
	const page = (files: string[] = []) => ({ id: createId(), content: 'content', files });
	/** A new Info Key's copies for staff and for these classrooms, named after `key`. */
	const newKey = (classrooms: string[], key = 'key') => ({
		infoKeyForStaff: `${key} for staff`,
		classrooms: classrooms.map((classroom) => ({ classroom, infoKey: `${key} for ${classroom}` }))
	});
	const change = (files: string[] = []) => ({ content: 'changed', files });
	const ids = ({ pages }: { pages: { id: string }[] }) => pages.map(({ id }) => id);
	// Pages without files never reach R2.
	const { bucket } = localStore().store;

	it('open for every staff member and family, whatever their classrooms, once the first page brings the key for every classroom', async () => {
		const db = localDatabase();
		const { teachers, head } = await setUpKindergarten(db);
		const [bubbles, owls] = [await addClassroomTo(db, head), await addClassroomTo(db, head)];
		const [inBubbles, inOwls] = [newFamily(), newFamily()];
		await addChildTo(db, head, bubbles, inBubbles);
		await addChildTo(db, head, owls, inOwls);
		const teacher = await addTeacherTo(db, head, []);
		const recovery = (await identityForCard(db, teachers[1].credential.authToken))!;
		expect(await accessFor(db, teacher)).toMatchObject({
			info: { infoKeyForStaff: null, pages: [] }
		});

		// A page before there's a key, or a first page from a device that didn’t know about a classroom, stores
		// nothing.
		await expect(addInfoPage(db, head, page())).rejects.toMatchObject(conflict('stale'));
		await expect(
			addInfoPage(db, head, { ...page(), key: newKey([bubbles]) })
		).rejects.toMatchObject(conflict('stale'));
		expect(await accessFor(db, await familyOf(db, inBubbles))).toMatchObject({
			info: { pages: [] },
			classrooms: [{ id: bubbles, infoKey: null }]
		});
		const first = page();
		expect(await addInfoPage(db, head, { ...first, key: newKey([bubbles, owls]) })).toEqual({
			infoKeyForStaff: 'key for staff',
			pages: [{ id: first.id, content: 'content', editedAt: expect.any(Number) }]
		});

		// Staff get the key for the Staff Key, those without classrooms too, and each family its classrooms’ copies.
		for (const viewer of [head, teacher, recovery]) {
			expect(await accessFor(db, viewer)).toMatchObject({
				info: { infoKeyForStaff: 'key for staff', pages: [{ id: first.id }] }
			});
		}
		const family = await accessFor(db, await familyOf(db, inOwls));
		expect(family).toMatchObject({
			info: { pages: [{ id: first.id }] },
			classrooms: [{ id: owls, infoKey: `key for ${owls}` }]
		});
		expect(family.info).not.toHaveProperty('infoKeyForStaff');

		// A later page that brings a key of its own, from a device that didn’t know about the first, is refused, and
		// the key stays.
		await expect(
			addInfoPage(db, head, { ...page(), key: newKey([bubbles, owls], 'other') })
		).rejects.toMatchObject(conflict('stale'));
		const second = page();
		await addInfoPage(db, head, second);
		expect(await accessFor(db, await familyOf(db, inBubbles))).toMatchObject({
			info: { pages: [{ id: first.id }, { id: second.id }] },
			classrooms: [{ id: bubbles, infoKey: `key for ${bubbles}` }]
		});
	});

	it('take a new classroom with a copy of the Info Key only once there is one', async () => {
		const db = localDatabase();
		const { head } = await setUpKindergarten(db);
		await expect(addClassroomTo(db, head, 'key')).rejects.toMatchObject(conflict('stale'));
		const bubbles = await addClassroomTo(db, head);
		await addInfoPage(db, head, { ...page(), key: newKey([bubbles]) });

		// Once there’s one, a classroom added without its copy, from a device that didn’t know, is refused.
		await expect(addClassroomTo(db, head)).rejects.toMatchObject(conflict('stale'));
		const owls = await addClassroomTo(db, head, 'key for owls');
		const family = newFamily();
		await addChildTo(db, head, owls, family);
		expect(await accessFor(db, await familyOf(db, family))).toMatchObject({
			classrooms: [{ id: owls, infoKey: 'key for owls' }]
		});
	});

	it('go after the others, in the order heads put them in, and change and go for heads', async () => {
		const db = localDatabase();
		const { head } = await setUpKindergarten(db);
		const [hours, meals, rules] = [page(), page(), page()];
		await addInfoPage(db, head, { ...hours, key: newKey([]) });
		await addInfoPage(db, head, meals);
		expect(ids(await addInfoPage(db, head, rules))).toEqual([hours.id, meals.id, rules.id]);

		// An order that leaves out a page, or names one that isn’t there, comes from a device that missed a change.
		await expect(orderInfoPages(db, head, [rules.id, hours.id])).rejects.toMatchObject(
			conflict('stale')
		);
		await expect(orderInfoPages(db, head, [rules.id, hours.id, createId()])).rejects.toMatchObject(
			conflict('stale')
		);
		const order = [rules.id, hours.id, meals.id];
		expect(ids(await orderInfoPages(db, head, order))).toEqual(order);

		// A change keeps a page’s place, and a deleted page leaves the others in theirs, with a new one after them.
		expect(await changeInfoPage(db, bucket, head, hours.id, change())).toMatchObject({
			pages: [{ id: rules.id }, { id: hours.id, content: 'changed' }, { id: meals.id }]
		});
		expect(ids(await deleteInfoPage(db, bucket, head, rules.id))).toEqual([hours.id, meals.id]);
		const last = page();
		expect(ids(await addInfoPage(db, head, last))).toEqual([hours.id, meals.id, last.id]);
		await expect(changeInfoPage(db, bucket, head, rules.id, change())).rejects.toMatchObject({
			status: 404
		});
		await expect(deleteInfoPage(db, bucket, head, rules.id)).rejects.toMatchObject({
			status: 404
		});
	});

	it('stop at the most a kindergarten keeps', async () => {
		const db = localDatabase();
		const { head } = await setUpKindergarten(db);
		await addInfoPage(db, head, { ...page(), key: newKey([]) });
		for (let count = 1; count < maxInfoPages; count++) await addInfoPage(db, head, page());
		await expect(addInfoPage(db, head, page())).rejects.toMatchObject(conflict('too-many-pages'));
	});

	it('carry the files uploaded for them, which go when a change leaves them out or their page goes, and files no page names a day later', async () => {
		const db = localDatabase();
		const { store, objects } = localStore();
		const { head } = await setUpKindergarten(db);
		const [hours, meals] = [page(), page()];
		const [menu, form, never] = [createId(), createId(), createId()];
		const file = (value: number) => new Uint8Array(64).fill(value);
		const objectKey = (pageId: string, fileId: string) => `info/${pageId}/${fileId}`;

		// A page can’t name a file that wasn’t uploaded for it, and no file is stored twice.
		const first = { ...hours, files: [menu, form], key: newKey([]) };
		await expect(addInfoPage(db, head, first)).rejects.toMatchObject(conflict('stale'));
		await uploadInfoFile(db, store, head, hours.id, menu, file(1));
		await uploadInfoFile(db, store, head, hours.id, form, file(2));
		await expect(uploadInfoFile(db, store, head, hours.id, menu, file(9))).rejects.toMatchObject(
			conflict('stored')
		);
		await addInfoPage(db, head, first);
		expect(await read(await infoFileBytes(db, store, hours.id, menu))).toEqual(file(1));
		await expect(infoFileBytes(db, store, meals.id, menu)).rejects.toMatchObject({ status: 404 });

		// A change that leaves a file out deletes it, and so does deleting its page. A file no page names goes in
		// the daily cleanup a day later.
		await changeInfoPage(db, store.bucket, head, hours.id, change([form]));
		await expect(infoFileBytes(db, store, hours.id, menu)).rejects.toMatchObject({ status: 404 });
		expect([...objects.keys()]).toEqual([objectKey(hours.id, form)]);
		await uploadInfoFile(db, store, head, meals.id, never, file(3));
		await deleteInfoPage(db, store.bucket, head, hours.id);
		expect([...objects.keys()]).toEqual([objectKey(meals.id, never)]);
		await cleanUp({ DB: db, FILES: store.bucket }, Date.now() + 2 * day);
		expect(objects.size).toBe(0);
		expect(await storedBytes(db)).toBe(0);
	});
});

describe('board photos', () => {
	const photo = (value: number) => new Uint8Array(64).fill(value);

	it('go up in a teacher’s own classrooms in place of the photo there, for that classroom only', async () => {
		const db = localDatabase();
		const { store, objects } = localStore();
		const { head } = await setUpKindergarten(db);
		const [bubbles, owls] = [await addClassroomTo(db, head), await addClassroomTo(db, head)];
		const [inBubbles, inOwls] = [newFamily(), newFamily()];
		await addChildTo(db, head, bubbles, inBubbles);
		await addChildTo(db, head, owls, inOwls);
		const teacher = await addTeacherTo(db, head, [bubbles]);
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

	it('come down for their classroom’s teachers and heads, and go with their classroom', async () => {
		const db = localDatabase();
		const { store, objects } = localStore();
		const { head } = await setUpKindergarten(db);
		const [bubbles, owls] = [await addClassroomTo(db, head), await addClassroomTo(db, head)];
		const teacher = await addTeacherTo(db, head, [bubbles]);
		const [inBubbles, inOwls] = [createId(), createId()];
		await putUpPhoto(db, store, head, bubbles, inBubbles, photo(1), 'details');
		await putUpPhoto(db, store, head, owls, inOwls, photo(2), 'details');

		await expect(takeDownPhoto(db, store.bucket, teacher, owls, inOwls)).rejects.toMatchObject(
			conflict('stale')
		);
		expect(await takeDownPhoto(db, store.bucket, teacher, bubbles, inBubbles)).toEqual([]);
		await expect(takeDownPhoto(db, store.bucket, head, bubbles, inBubbles)).rejects.toMatchObject({
			status: 404
		});
		await deleteClassroom(db, store.bucket, head, owls);
		expect(await boardPhotos(db, head)).toEqual([]);
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
		const { head } = await setUpKindergarten(db);
		const bubbles = await addClassroomTo(db, head);
		const photo = createId();
		await putUpPhoto(db, store, head, bubbles, photo, bytes(10), 'details', 1_000);
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
		subscribe(
			db,
			{ endpoint: endpoint(name), p256dh: null, auth: null },
			(await sessionHash(device))!
		);
	const subscribed = async (db: D1Database) => {
		const { results } = await db
			.prepare('SELECT endpoint FROM push_subscriptions ORDER BY endpoint')
			.all<{ endpoint: string }>();
		return results.map((row) => row.endpoint);
	};

	it('reach the families and teachers of a notice’s classrooms, except the device that posted it', async () => {
		const db = localDatabase();
		const { teachers, head } = await setUpKindergarten(db);
		const [bubbles, owls] = [await addClassroomTo(db, head), await addClassroomTo(db, head)];
		const [inBubbles, inOwls] = [newFamily(), newFamily()];
		await addChildTo(db, head, bubbles, inBubbles);
		await addChildTo(db, head, owls, inOwls);
		const teacher = await addTeacherTo(db, head, [bubbles]);
		const poster = await deviceWith(db, teacher.credential);
		for (const [name, device] of [
			['family', await deviceWith(db, inBubbles.credential.id)],
			['other-family', await deviceWith(db, inOwls.credential.id)],
			['teacher', await deviceWith(db, teacher.credential)],
			['poster', poster],
			['head', await deviceWith(db, teachers[0].credential.id)]
		] as const) {
			await turnOn(db, device, name);
		}

		// The head is assigned to no classroom and hears about every one she hasn't muted.
		const reached = await recipients(db, [bubbles], await sessionHash(poster));
		expect(reached.map(({ endpoint }) => endpoint).sort()).toEqual([
			endpoint('family'),
			endpoint('head'),
			endpoint('teacher')
		]);
		await setMutedClassrooms(db, head, [bubbles]);
		expect(
			(await recipients(db, [bubbles], undefined)).map(({ endpoint }) => endpoint)
		).not.toContain(endpoint('head'));
		// A notice for two classrooms reaches her as long as one of them speaks up.
		expect(
			(await recipients(db, [bubbles, owls], undefined)).map(({ endpoint }) => endpoint)
		).toContain(endpoint('head'));
		await expect(setMutedClassrooms(db, head, [createId()])).rejects.toMatchObject(
			conflict('stale')
		);
	});

	it('end with their session: signing out, a replaced card, or a session that ran out', async () => {
		const db = localDatabase();
		const { teachers, head } = await setUpKindergarten(db);
		const bubbles = await addClassroomTo(db, head);
		const family = newFamily();
		await addChildTo(db, head, bubbles, family);
		const [familyDevice, headDevice, laterDevice] = [
			await deviceWith(db, family.credential.id),
			await deviceWith(db, teachers[0].credential.id),
			await deviceWith(db, teachers[1].credential.id)
		];
		await turnOn(db, familyDevice, 'family');
		await turnOn(db, headDevice, 'head');
		await turnOn(db, laterDevice, 'later');

		await replaceFamilyCards(db, head, [{ family: family.id, credential: credential() }]);
		await endSession(headDevice);
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
		const subscriber = (status: number) => ({
			endpoint: endpoint(status),
			p256dh: null,
			auth: null
		});
		const body: PushMessage = {
			devices: statuses.map(subscriber),
			subject,
			kind: 'notice',
			attempt: 0
		};
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
			[
				{ devices: [subscriber(429), subscriber(503)], subject, kind: 'notice', attempt: 1 },
				{ delaySeconds: 60 }
			]
		]);
		expect(acknowledged).toBe(true);
	});
});
