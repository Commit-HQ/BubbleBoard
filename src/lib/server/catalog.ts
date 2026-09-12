import { error } from '@sveltejs/kit';
import type {
	Access,
	ChildChange,
	ChildRemoval,
	FamilyLinks,
	Kindergarten,
	NewChild,
	NewClassroom,
	NewCredential,
	NewFamily,
	NewTeacher,
	Setup,
	TeacherChange
} from '$lib/api';
import { hashAuthToken } from '$lib/crypto';
import type { Identity, Staff } from './session';

// The kindergarten's records: plain SQL, and one batch, which D1 runs as a transaction, for each change.
// Every name is inside an encrypted profile, so these checks are about access and structure.

type Owner = { teacher: string } | { family: string };

/** Runs statements as one transaction, turning broken invariants into conflicts the app can explain. */
async function transaction(db: D1Database, statements: D1PreparedStatement[]) {
	try {
		return await db.batch(statements);
	} catch (cause) {
		const message = cause instanceof Error ? cause.message : '';
		if (message.includes('last-admin')) error(409, 'last-admin');
		// The records changed since the device read them, or something the change refers to is gone.
		if (message.includes('stale') || message.includes('FOREIGN KEY constraint failed')) {
			error(409, 'stale');
		}
		throw cause;
	}
}

/**
 * The first statement of a change to children and family cards: it moves the catalog revision on from
 * the one the device read, which the database refuses when another change came first.
 */
function nextRevision(db: D1Database, revision: number) {
	return db.prepare('UPDATE installation SET revision = ?').bind(revision + 1);
}

async function found(query: D1PreparedStatement) {
	if (!(await query.first())) error(404, 'not-found');
}

async function changesOne(db: D1Database, statement: D1PreparedStatement) {
	const [{ meta }] = await transaction(db, [statement]);
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

/** A new card replaces its owner's earlier card, which also ends every session that card started. */
async function replaceCard(db: D1Database, owner: Owner, credential: NewCredential) {
	// Teacher and family IDs are random, so one ID never matches both columns.
	const ownerId = 'teacher' in owner ? owner.teacher : owner.family;
	await transaction(db, [
		db.prepare('DELETE FROM credentials WHERE teacher_id = ?1 OR family_id = ?1').bind(ownerId),
		await insertCredential(db, owner, credential)
	]);
}

/** Sets up the installation once. Repeating a setup that succeeded, after a lost response, is fine. */
export async function setUp(db: D1Database, teachers: Setup['teachers']) {
	const [admin] = teachers;
	const repeated = await db
		.prepare('SELECT 1 FROM credentials WHERE id = ? AND auth_token_hash = ?')
		.bind(admin.credential.id, await hashAuthToken(admin.credential.authToken))
		.first();
	if (repeated) return;
	const statements = [
		db.prepare('INSERT INTO installation (id, set_up_at) VALUES (1, ?)').bind(Date.now())
	];
	for (const teacher of teachers) {
		statements.push(
			db
				.prepare('INSERT INTO teachers (id, admin, profile) VALUES (?, 1, ?)')
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

/** What a connected device needs to open its keys: its card's wrapped key and a family's classrooms. */
export async function accessFor(db: D1Database, current: Identity): Promise<Access> {
	if (current.kind === 'staff') return current;
	const { results } = await db
		.prepare(
			`SELECT c.id, c.profile, fc.group_key_for_family FROM family_classrooms fc
			JOIN classrooms c ON c.id = fc.classroom_id WHERE fc.family_id = ?`
		)
		.bind(current.family)
		.all<{ id: string; profile: string; group_key_for_family: string }>();
	const classrooms = results.map((row) => ({
		id: row.id,
		profile: row.profile,
		groupKeyForFamily: row.group_key_for_family
	}));
	return { ...current, classrooms };
}

export async function kindergarten(db: D1Database, staff: Staff): Promise<Kindergarten> {
	// Admins see everything. Teachers see their classrooms, the children and families in them, and
	// themselves. ?1 is whether the staff member is an admin, ?2 their teacher ID.
	const visible =
		'SELECT id FROM classrooms WHERE ?1 UNION SELECT classroom_id FROM teacher_classrooms WHERE teacher_id = ?2';
	const query = (sql: string) => db.prepare(sql).bind(Number(staff.admin), staff.teacher);
	const [installation, classrooms, teachers, assignments, children, families, memberships] =
		await db.batch([
			db.prepare('SELECT revision FROM installation'),
			query(`SELECT id, profile, group_key_for_staff FROM classrooms WHERE id IN (${visible})`),
			query('SELECT id, admin, profile FROM teachers WHERE ?1 OR id = ?2'),
			query('SELECT teacher_id, classroom_id FROM teacher_classrooms WHERE ?1 OR teacher_id = ?2'),
			query(`SELECT id, classroom_id, profile FROM children WHERE classroom_id IN (${visible})`),
			query(
				`SELECT id, profile, family_key_for_staff FROM families WHERE ?1 OR id IN (SELECT family_id FROM family_classrooms WHERE classroom_id IN (${visible}))`
			),
			query(
				`SELECT family_id, classroom_id FROM family_classrooms WHERE classroom_id IN (${visible})`
			)
		]);
	const teacherClassrooms = classroomsBy(
		rows<{ teacher_id: string; classroom_id: string }>(assignments),
		(row) => row.teacher_id
	);
	const familyClassrooms = classroomsBy(
		rows<{ family_id: string; classroom_id: string }>(memberships),
		(row) => row.family_id
	);
	return {
		revision: rows<{ revision: number }>(installation)[0]?.revision ?? 0,
		classrooms: rows<{ id: string; profile: string; group_key_for_staff: string }>(classrooms).map(
			(row) => ({ id: row.id, profile: row.profile, groupKeyForStaff: row.group_key_for_staff })
		),
		teachers: rows<{ id: string; admin: number; profile: string }>(teachers).map((row) => ({
			id: row.id,
			admin: row.admin === 1,
			profile: row.profile,
			classrooms: teacherClassrooms.get(row.id) ?? []
		})),
		children: rows<{ id: string; classroom_id: string; profile: string }>(children).map((row) => ({
			id: row.id,
			classroom: row.classroom_id,
			profile: row.profile
		})),
		families: rows<{ id: string; profile: string; family_key_for_staff: string }>(families).map(
			(row) => ({
				id: row.id,
				profile: row.profile,
				familyKeyForStaff: row.family_key_for_staff,
				classrooms: familyClassrooms.get(row.id) ?? []
			})
		)
	};
}

function rows<T>(result: D1Result) {
	return result.results as T[];
}

/** Each owner's classroom IDs, from rows that pair an owner with a classroom. */
function classroomsBy<T extends { classroom_id: string }>(pairs: T[], owner: (row: T) => string) {
	const groups = new Map<string, string[]>();
	for (const pair of pairs) {
		groups.set(owner(pair), [...(groups.get(owner(pair)) ?? []), pair.classroom_id]);
	}
	return groups;
}

export async function addClassroom(db: D1Database, classroom: NewClassroom) {
	await transaction(db, [
		db
			.prepare('INSERT INTO classrooms (id, profile, group_key_for_staff) VALUES (?, ?, ?)')
			.bind(classroom.id, classroom.profile, classroom.groupKeyForStaff)
	]);
}

export function renameClassroom(db: D1Database, id: string, profile: string) {
	return changesOne(
		db,
		db.prepare('UPDATE classrooms SET profile = ? WHERE id = ?').bind(profile, id)
	);
}

export async function deleteClassroom(db: D1Database, id: string) {
	if (await db.prepare('SELECT 1 FROM children WHERE classroom_id = ?').bind(id).first()) {
		error(409, 'not-empty');
	}
	await changesOne(db, db.prepare('DELETE FROM classrooms WHERE id = ?').bind(id));
}

function assignments(db: D1Database, teacher: string, classrooms: string[]) {
	return classrooms.map((classroom) =>
		db
			.prepare('INSERT INTO teacher_classrooms (teacher_id, classroom_id) VALUES (?, ?)')
			.bind(teacher, classroom)
	);
}

export async function addTeacher(db: D1Database, teacher: NewTeacher) {
	await transaction(db, [
		db
			.prepare('INSERT INTO teachers (id, admin, profile) VALUES (?, ?, ?)')
			.bind(teacher.id, Number(teacher.admin), teacher.profile),
		await insertCredential(db, { teacher: teacher.id }, teacher.credential),
		...assignments(db, teacher.id, teacher.classrooms)
	]);
}

export async function changeTeacher(db: D1Database, id: string, change: TeacherChange) {
	await found(db.prepare('SELECT 1 FROM teachers WHERE id = ?').bind(id));
	await transaction(db, [
		db
			.prepare('UPDATE teachers SET admin = ?, profile = ? WHERE id = ?')
			.bind(Number(change.admin), change.profile, id),
		db.prepare('DELETE FROM teacher_classrooms WHERE teacher_id = ?').bind(id),
		...assignments(db, id, change.classrooms)
	]);
}

/** Removes a teacher with their card and sessions. The database refuses to remove the last admin. */
export function removeTeacher(db: D1Database, id: string) {
	return changesOne(db, db.prepare('DELETE FROM teachers WHERE id = ?').bind(id));
}

export async function replaceTeacherCard(db: D1Database, id: string, credential: NewCredential) {
	await found(db.prepare('SELECT 1 FROM teachers WHERE id = ?').bind(id));
	await replaceCard(db, { teacher: id }, credential);
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

function familyChanges(db: D1Database, links: Omit<FamilyLinks, 'newFamilies'>) {
	return [
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
		// With their cards, sessions, and remaining classrooms.
		...links.removeFamilies.map((family) =>
			db.prepare('DELETE FROM families WHERE id = ?').bind(family)
		)
	];
}

export async function addChild(db: D1Database, child: NewChild) {
	await transaction(db, [
		nextRevision(db, child.revision),
		...(await newFamilies(db, child.newFamilies)),
		db
			.prepare('INSERT INTO children (id, classroom_id, profile) VALUES (?, ?, ?)')
			.bind(child.id, child.classroom, child.profile),
		...familyChanges(db, child)
	]);
}

export async function changeChild(db: D1Database, id: string, change: ChildChange) {
	await found(db.prepare('SELECT 1 FROM children WHERE id = ?').bind(id));
	await transaction(db, [
		nextRevision(db, change.revision),
		...(await newFamilies(db, change.newFamilies)),
		db
			.prepare('UPDATE children SET classroom_id = ?, profile = ? WHERE id = ?')
			.bind(change.classroom, change.profile, id),
		...familyChanges(db, change)
	]);
}

export async function removeChild(db: D1Database, id: string, removal: ChildRemoval) {
	await found(db.prepare('SELECT 1 FROM children WHERE id = ?').bind(id));
	await transaction(db, [
		nextRevision(db, removal.revision),
		db.prepare('DELETE FROM children WHERE id = ?').bind(id),
		...familyChanges(db, { addMemberships: [], ...removal })
	]);
}

export function renameFamily(db: D1Database, id: string, profile: string) {
	return changesOne(
		db,
		db.prepare('UPDATE families SET profile = ? WHERE id = ?').bind(profile, id)
	);
}

/** Admins can replace any family's card, and teachers those of families in their classrooms. */
export async function replaceFamilyCard(
	db: D1Database,
	staff: Staff,
	id: string,
	credential: NewCredential
) {
	await found(
		staff.admin
			? db.prepare('SELECT 1 FROM families WHERE id = ?').bind(id)
			: db
					.prepare(
						`SELECT 1 FROM family_classrooms fc JOIN teacher_classrooms tc ON tc.classroom_id = fc.classroom_id
						WHERE fc.family_id = ? AND tc.teacher_id = ?`
					)
					.bind(id, staff.teacher)
	);
	await replaceCard(db, { family: id }, credential);
}
