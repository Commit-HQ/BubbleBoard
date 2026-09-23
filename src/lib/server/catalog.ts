import { projectionStatements } from './events';
import { error } from '@sveltejs/kit';
import type {
	Access,
	ChildChange,
	FamilyCard,
	FamilyIdentity,
	FamilyLinks,
	Identity,
	Kindergarten,
	NewChild,
	NewClassroom,
	NewCredential,
	NewFamily,
	NewTeacher,
	Setup,
	Staff,
	StaffRole,
	TeacherChange
} from '$lib/api';
import { hashAuthToken } from '$lib/crypto';
import {
	checkClassrooms,
	includesAll,
	isHead,
	transaction,
	visibleClassrooms,
	visibleFamilies
} from './database';
import { familyInfo, staffInfo } from './info';
import { board } from './notices';
import { boardPhotos } from './photos';
import { mutedClassrooms } from './push';
import type { Head, Manager } from './session';
import { deleteMarked } from './storage';

// The kindergarten's records: plain SQL, and one batch, which D1 runs as a transaction, for each change.
// Every name is inside an encrypted profile, so these checks are about access and structure. A change takes
// the staff member whose role was checked — the head for the kindergarten's own shape, a head or a group
// lead for children and families — and returns the records as they are now, so the app doesn't have to ask
// for them again. A lead reaches only the classrooms she holds, which the queries here narrow her to.

type Owner = { teacher: string } | { family: string };

/**
 * Starts a change to who can open what by moving the revision on from the one its device read. The
 * database refuses when another change came first, so an outdated device can't undo that change.
 */
function nextRevision(db: D1Database, revision: number) {
	return db.prepare('UPDATE installation SET revision = ?').bind(revision + 1);
}

async function found(query: D1PreparedStatement) {
	if (!(await query.first())) error(404, 'not-found');
}

/** Runs a change as one transaction, answering not found when its first statement changed nothing. */
async function changesOne(db: D1Database, ...statements: D1PreparedStatement[]) {
	const [{ meta }] = await transaction(db, statements);
	if (!meta.changes) error(404, 'not-found');
}

async function insertCredential(db: D1Database, owner: Owner, credential: NewCredential) {
	return db
		.prepare(
			'INSERT INTO credentials (id, teacher_id, family_id, auth_token_hash, wrapped_key) VALUES (?, ?, ?, ?, ?)'
		)
		.bind(
			credential.id,
			'teacher' in owner ? owner.teacher : null,
			'family' in owner ? owner.family : null,
			await hashAuthToken(credential.authToken),
			credential.wrappedKey
		);
}

/** A new card in place of its owner's earlier card, whose removal ends every session that card started. */
async function replaceCard(db: D1Database, owner: Owner, credential: NewCredential) {
	// Teacher and family IDs are random, so one ID never matches both columns.
	const ownerId = 'teacher' in owner ? owner.teacher : owner.family;
	return [
		db.prepare('DELETE FROM credentials WHERE teacher_id = ?1 OR family_id = ?1').bind(ownerId),
		await insertCredential(db, owner, credential)
	];
}

/** Sets up the installation once. Repeating a setup that succeeded, after a lost response, is fine. */
export async function setUp(db: D1Database, teachers: Setup['teachers']) {
	const [first] = teachers;
	const repeated = await db
		.prepare('SELECT 1 FROM credentials WHERE id = ? AND auth_token_hash = ?')
		.bind(first.credential.id, await hashAuthToken(first.credential.authToken))
		.first();
	if (repeated) return;
	const statements = [
		db.prepare('INSERT INTO installation (id, set_up_at) VALUES (1, ?)').bind(Date.now())
	];
	for (const teacher of teachers) {
		statements.push(
			db
				.prepare("INSERT INTO teachers (id, role, profile) VALUES (?, 'head', ?)")
				.bind(teacher.id, teacher.profile),
			await insertCredential(db, { teacher: teacher.id }, teacher.credential)
		);
	}
	try {
		await db.batch(statements);
	} catch (cause) {
		if (await db.prepare('SELECT 1 FROM installation').first()) error(409, 'already-set-up');
		throw cause;
	}
}

/**
 * What a connected device opens: a staff member's records, or the classrooms a family's card joined, each with its
 * copy of the Info Key, with the notices and board photos of the classrooms it sees, and the info pages.
 */
export async function accessFor(db: D1Database, current: Identity): Promise<Access> {
	const onTheBoard = Promise.all([board(db, current), boardPhotos(db, current)]);
	if (current.kind === 'staff') {
		const [records, [notices, photos], info, muted] = await Promise.all([
			kindergarten(db, current),
			onTheBoard,
			staffInfo(db),
			mutedClassrooms(db, current)
		]);
		return { ...current, kindergarten: records, notices, photos, info, mutedClassrooms: muted };
	}
	type Classroom = {
		id: string;
		profile: string;
		groupKeyForFamily: string;
		infoKey: string | null;
	};
	const [{ results }, [notices, photos], info] = await Promise.all([
		db
			.prepare(
				`SELECT c.id, c.profile, fc.group_key_for_family AS groupKeyForFamily, c.info_key AS infoKey
				FROM family_classrooms fc JOIN classrooms c ON c.id = fc.classroom_id WHERE fc.family_id = ?`
			)
			.bind(current.family)
			.all<Classroom>(),
		onTheBoard,
		familyInfo(db)
	]);
	return { ...current, classrooms: results, notices, photos, info };
}

export async function kindergarten(db: D1Database, staff: Staff): Promise<Kindergarten> {
	// The head sees everything. Anyone else sees the classrooms she holds, the children and families in
	// them, herself, and whoever else is assigned to those classrooms. ?1 is whether she's the head, ?2 her
	// teacher ID.
	const visible =
		'SELECT id FROM classrooms WHERE ?1 UNION SELECT classroom_id FROM teacher_classrooms WHERE teacher_id = ?2';
	const query = (sql: string) => db.prepare(sql).bind(Number(isHead(staff)), staff.teacher);
	const [installation, classrooms, teachers, children, families] = await db.batch([
		db.prepare('SELECT revision FROM installation'),
		query(
			`SELECT id, profile, group_key_for_staff AS groupKeyForStaff FROM classrooms WHERE id IN (${visible})`
		),
		query(
			`SELECT id, role, profile, (SELECT json_group_array(classroom_id) FROM teacher_classrooms
			WHERE teacher_id = teachers.id) AS classrooms FROM teachers WHERE ?1 OR id = ?2
			OR id IN (SELECT teacher_id FROM teacher_classrooms WHERE classroom_id IN (${visible}))`
		),
		query(
			`SELECT id, classroom_id AS classroom, profile FROM children WHERE classroom_id IN (${visible})`
		),
		// A family comes with every classroom it belongs to, whether or not the device sees that classroom:
		// otherwise a lead's device would plan a family's links as if the other group's child weren't there.
		query(
			`SELECT id, profile, family_key_for_staff AS familyKeyForStaff, (SELECT json_group_array(classroom_id)
			FROM family_classrooms WHERE family_id = families.id) AS classrooms
			FROM families WHERE ?1 OR id IN (SELECT family_id FROM family_classrooms WHERE classroom_id IN (${visible}))`
		)
	]);
	// SQLite has no arrays: classroom IDs come as a JSON array.
	type TeacherRow = { id: string; role: StaffRole; profile: string; classrooms: string };
	type FamilyRow = { id: string; profile: string; familyKeyForStaff: string; classrooms: string };
	return {
		revision: (installation.results as { revision: number }[])[0]?.revision ?? 0,
		classrooms: classrooms.results as Kindergarten['classrooms'],
		teachers: (teachers.results as TeacherRow[]).map((row) => ({
			...row,
			classrooms: JSON.parse(row.classrooms) as string[]
		})),
		children: children.results as Kindergarten['children'],
		families: (families.results as FamilyRow[]).map((row) => ({
			...row,
			classrooms: JSON.parse(row.classrooms) as string[]
		}))
	};
}

/**
 * Adds a classroom. Once the kindergarten has an Info Key, the classroom brings a copy of it, and the database
 * refuses it without one, or with one before there's a key (migrations/0013_info.sql).
 */
export async function addClassroom(db: D1Database, head: Head, classroom: NewClassroom) {
	await transaction(db, [
		db
			.prepare(
				'INSERT INTO classrooms (id, profile, group_key_for_staff, info_key) VALUES (?, ?, ?, ?)'
			)
			.bind(classroom.id, classroom.profile, classroom.groupKeyForStaff, classroom.infoKey ?? null)
	]);
	return kindergarten(db, head);
}

export async function renameClassroom(db: D1Database, head: Head, id: string, profile: string) {
	await changesOne(
		db,
		db.prepare('UPDATE classrooms SET profile = ? WHERE id = ?').bind(profile, id)
	);
	return kindergarten(db, head);
}

/**
 * Deletes a classroom without children, with its board photo and the notices for it alone, and what R2 keeps
 * for them. The files of notices it shared with other classrooms stay with those notices.
 */
export async function deleteClassroom(db: D1Database, bucket: R2Bucket, head: Head, id: string) {
	if (await db.prepare('SELECT 1 FROM children WHERE classroom_id = ?').bind(id).first()) {
		error(409, 'not-empty');
	}
	await changesOne(
		db,
		db.prepare('DELETE FROM classrooms WHERE id = ?').bind(id),
		// Notices for this classroom alone go with it.
		db.prepare('DELETE FROM notices WHERE id NOT IN (SELECT notice_id FROM notice_classrooms)')
	);
	await deleteMarked(db, bucket);
	return kindergarten(db, head);
}

function assignments(db: D1Database, teacher: string, classrooms: string[]) {
	return classrooms.map((classroom) =>
		db
			.prepare('INSERT INTO teacher_classrooms (teacher_id, classroom_id) VALUES (?, ?)')
			.bind(teacher, classroom)
	);
}

export async function addTeacher(db: D1Database, head: Head, teacher: NewTeacher) {
	await transaction(db, [
		db
			.prepare('INSERT INTO teachers (id, role, profile) VALUES (?, ?, ?)')
			.bind(teacher.id, teacher.role, teacher.profile),
		await insertCredential(db, { teacher: teacher.id }, teacher.credential),
		...assignments(db, teacher.id, teacher.classrooms)
	]);
	return kindergarten(db, head);
}

export async function changeTeacher(db: D1Database, head: Head, id: string, change: TeacherChange) {
	await found(db.prepare('SELECT 1 FROM teachers WHERE id = ?').bind(id));
	await transaction(db, [
		nextRevision(db, change.revision),
		db
			.prepare('UPDATE teachers SET role = ?, profile = ? WHERE id = ?')
			.bind(change.role, change.profile, id),
		db.prepare('DELETE FROM teacher_classrooms WHERE teacher_id = ?').bind(id),
		...assignments(db, id, change.classrooms),
		// Only a head chooses which classrooms notify her, so that choice goes when she stops being one.
		db
			.prepare("DELETE FROM teacher_muted_classrooms WHERE teacher_id = ?1 AND ?2 <> 'head'")
			.bind(id, change.role)
	]);
	return kindergarten(db, head);
}

/** Removes a teacher with their card and sessions. The database refuses to remove the last head. */
export async function removeTeacher(db: D1Database, head: Head, id: string) {
	await changesOne(db, db.prepare('DELETE FROM teachers WHERE id = ?').bind(id));
	return kindergarten(db, head);
}

export async function replaceTeacherCard(
	db: D1Database,
	head: Head,
	id: string,
	credential: NewCredential
) {
	await found(db.prepare('SELECT 1 FROM teachers WHERE id = ?').bind(id));
	await transaction(db, await replaceCard(db, { teacher: id }, credential));
	return kindergarten(db, head);
}

async function newFamilies(db: D1Database, families: NewFamily[]) {
	const statements: D1PreparedStatement[] = [];
	for (const family of families) {
		statements.push(
			db
				.prepare('INSERT INTO families (id, profile, family_key_for_staff) VALUES (?, ?, ?)')
				.bind(family.id, family.profile, family.familyKeyForStaff),
			await insertCredential(db, { family: family.id }, family.credential)
		);
	}
	return statements;
}

/**
 * A child the manager may change: one in a classroom she holds. A child in another group is as good as
 * missing to a lead, so she's told the same as for a child that isn't there.
 */
async function ownChild(db: D1Database, manager: Manager, id: string) {
	const [visible, params] = visibleClassrooms(manager);
	await found(
		db
			.prepare(`SELECT 1 FROM children WHERE id = ? AND classroom_id IN (${visible})`)
			.bind(id, ...params)
	);
}

/**
 * The families the manager may rename or hand a new card: those with a child in a classroom she holds. A
 * family that spans other groups counts, card and all — replacing it is how a lost card is settled.
 */
async function ownFamilies(db: D1Database, manager: Manager, families: string[]) {
	if (!(await includesAll(db, families, ...visibleFamilies(manager)))) error(404, 'not-found');
}

/** Changes a child along with its family links. New families exist before the child refers to them. */
async function changeChildren(
	db: D1Database,
	manager: Manager,
	links: FamilyLinks & { classroom?: string },
	child: D1PreparedStatement,
	after: D1PreparedStatement[] = []
) {
	// The classroom the child goes into, and every membership the change touches, is one the manager holds,
	// checked together. A new family is linked by one of these, so it needs no check of its own.
	const memberships = [...links.addMemberships, ...links.removeMemberships];
	await checkClassrooms(db, manager, [
		...new Set([
			...(links.classroom ? [links.classroom] : []),
			...memberships.map(({ classroom }) => classroom)
		])
	]);
	const [visible, params] = visibleClassrooms(manager);
	await transaction(db, [
		nextRevision(db, links.revision),
		...(await newFamilies(db, links.newFamilies)),
		child,
		...links.addMemberships.map(({ family, classroom, groupKeyForFamily }) =>
			db
				.prepare(
					'INSERT INTO family_classrooms (family_id, classroom_id, group_key_for_family) VALUES (?, ?, ?)'
				)
				.bind(family, classroom, groupKeyForFamily)
		),
		...links.removeMemberships.map(({ family, classroom }) =>
			db
				.prepare('DELETE FROM family_classrooms WHERE family_id = ? AND classroom_id = ?')
				.bind(family, classroom)
		),
		...after,
		// With their cards, sessions, and remaining classrooms. A family that still reaches a classroom
		// outside the manager's stays: its last child left her group, not the kindergarten, and its card is
		// the other group's to keep. A head holds every classroom, so nothing is ever held back from her.
		...links.removeFamilies.map((family) =>
			db
				.prepare(
					`DELETE FROM families WHERE id = ?1 AND NOT EXISTS (SELECT 1 FROM family_classrooms
					WHERE family_id = ?1 AND classroom_id NOT IN (${visible}))`
				)
				.bind(family, ...params)
		)
	]);
	return kindergarten(db, manager);
}

export async function addChild(db: D1Database, manager: Manager, child: NewChild) {
	return changeChildren(
		db,
		manager,
		child,
		db
			.prepare('INSERT INTO children (id, classroom_id, profile) VALUES (?, ?, ?)')
			.bind(child.id, child.classroom, child.profile),
		child.photoFamilies ? projectionStatements(db, child.id, child.photoFamilies) : []
	);
}

export async function changeChild(
	db: D1Database,
	manager: Manager,
	id: string,
	change: ChildChange
) {
	await ownChild(db, manager, id);
	return changeChildren(
		db,
		manager,
		change,
		db
			.prepare('UPDATE children SET classroom_id = ?, profile = ? WHERE id = ?')
			.bind(change.classroom, change.profile, id),
		[
			db
				.prepare(
					'DELETE FROM meeting_invites WHERE child_id=? AND family_id NOT IN (SELECT value FROM json_each(?))'
				)
				.bind(id, JSON.stringify(change.meetingFamilies)),
			...(change.photoFamilies ? projectionStatements(db, id, change.photoFamilies) : [])
		]
	);
}

export async function removeChild(
	db: D1Database,
	manager: Manager,
	id: string,
	links: FamilyLinks
) {
	await ownChild(db, manager, id);
	return changeChildren(
		db,
		manager,
		links,
		db.prepare('DELETE FROM children WHERE id = ?').bind(id)
	);
}

export async function renameFamily(db: D1Database, manager: Manager, id: string, profile: string) {
	await ownFamilies(db, manager, [id]);
	await changesOne(
		db,
		db.prepare('UPDATE families SET profile = ? WHERE id = ?').bind(profile, id)
	);
	return kindergarten(db, manager);
}

/**
 * Replaces the cards of several families together, or of none when one of them is gone. A family card can
 * reach every classroom the family's children are in, so the head and the leads of those classrooms replace
 * them (docs/access-format.md), and a replacement always signs the family's devices out: it is a reset, not
 * a quieter rotation.
 */
export async function replaceFamilyCards(db: D1Database, manager: Manager, cards: FamilyCard[]) {
	// Each family comes once (validate.ts).
	await ownFamilies(
		db,
		manager,
		cards.map(({ family }) => family)
	);
	const replacements = await Promise.all(
		cards.map(({ family, credential }) => replaceCard(db, { family }, credential))
	);
	await transaction(db, replacements.flat());
}

/** How long a one-time card can connect a device, and how many of a family's can wait for one. */
const oneTimeCardLifetime = 24 * 60 * 60 * 1000;
const waitingOneTimeCards = 5;

/**
 * Stores a one-time card that a family's device made for another of its devices, and returns until when it can
 * connect one (decisions.md). A family's newest few wait, and a new one ends the oldest beyond them, so no
 * device can pile them up.
 */
export async function addOneTimeCard(
	db: D1Database,
	family: FamilyIdentity,
	credential: NewCredential,
	now = Date.now()
) {
	const until = now + oneTimeCardLifetime;
	await transaction(db, [
		db
			.prepare(
				`UPDATE credentials SET connects_until = 0 WHERE id IN (SELECT id FROM credentials
				WHERE family_id = ?1 AND connects_until > ?2 ORDER BY connects_until DESC LIMIT -1 OFFSET ?3)`
			)
			.bind(family.family, now, waitingOneTimeCards - 1),
		await insertCredential(db, { family: family.family }, credential),
		db.prepare('UPDATE credentials SET connects_until = ? WHERE id = ?').bind(until, credential.id)
	]);
	return until;
}
