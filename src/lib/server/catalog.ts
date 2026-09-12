import { error } from '@sveltejs/kit';
import type {
	Access,
	ChildChange,
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
	TeacherChange
} from '$lib/api';
import { hashAuthToken } from '$lib/crypto';
import type { Admin } from './session';

// The kindergarten's records: plain SQL, and one batch, which D1 runs as a transaction, for each change.
// Every name is inside an encrypted profile, so these checks are about access and structure. An admin's
// change takes the admin whose rights were checked, and returns the records as they are now, so the app
// doesn't have to ask for them again.

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
 * Starts a change to who can open what by moving the revision on from the one its device read. The
 * database refuses when another change came first, so an outdated device can't undo that change.
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

/** What a connected device opens: a staff member's records, or the classrooms a family's card joined. */
export async function accessFor(db: D1Database, current: Identity): Promise<Access> {
	if (current.kind === 'staff')
		return { ...current, kindergarten: await kindergarten(db, current) };
	const { results } = await db
		.prepare(
			`SELECT c.id, c.profile, fc.group_key_for_family AS groupKeyForFamily FROM family_classrooms fc
			JOIN classrooms c ON c.id = fc.classroom_id WHERE fc.family_id = ?`
		)
		.bind(current.family)
		.all<{ id: string; profile: string; groupKeyForFamily: string }>();
	return { ...current, classrooms: results };
}

export async function kindergarten(db: D1Database, staff: Staff): Promise<Kindergarten> {
	// Admins see everything. Teachers see their classrooms, the children and families in them, and
	// themselves. ?1 is whether the staff member is an admin, ?2 their teacher ID.
	const visible =
		'SELECT id FROM classrooms WHERE ?1 UNION SELECT classroom_id FROM teacher_classrooms WHERE teacher_id = ?2';
	const query = (sql: string) => db.prepare(sql).bind(Number(staff.admin), staff.teacher);
	const [installation, classrooms, teachers, children, families] = await db.batch([
		db.prepare('SELECT revision FROM installation'),
		query(
			`SELECT id, profile, group_key_for_staff AS groupKeyForStaff FROM classrooms WHERE id IN (${visible})`
		),
		query(
			`SELECT id, admin, profile, (SELECT json_group_array(classroom_id) FROM teacher_classrooms
			WHERE teacher_id = teachers.id) AS classrooms FROM teachers WHERE ?1 OR id = ?2`
		),
		query(
			`SELECT id, classroom_id AS classroom, profile FROM children WHERE classroom_id IN (${visible})`
		),
		query(
			`SELECT id, profile, family_key_for_staff AS familyKeyForStaff, (SELECT json_group_array(classroom_id)
			FROM family_classrooms WHERE family_id = families.id AND classroom_id IN (${visible})) AS classrooms
			FROM families WHERE ?1 OR id IN (SELECT family_id FROM family_classrooms WHERE classroom_id IN (${visible}))`
		)
	]);
	// SQLite has no booleans or arrays: admin is 0 or 1, and classroom IDs come as a JSON array.
	type TeacherRow = { id: string; admin: number; profile: string; classrooms: string };
	type FamilyRow = { id: string; profile: string; familyKeyForStaff: string; classrooms: string };
	return {
		revision: (installation.results as { revision: number }[])[0]?.revision ?? 0,
		classrooms: classrooms.results as Kindergarten['classrooms'],
		teachers: (teachers.results as TeacherRow[]).map((row) => ({
			...row,
			admin: row.admin === 1,
			classrooms: JSON.parse(row.classrooms) as string[]
		})),
		children: children.results as Kindergarten['children'],
		families: (families.results as FamilyRow[]).map((row) => ({
			...row,
			classrooms: JSON.parse(row.classrooms) as string[]
		}))
	};
}

export async function addClassroom(db: D1Database, admin: Admin, classroom: NewClassroom) {
	await transaction(db, [
		db
			.prepare('INSERT INTO classrooms (id, profile, group_key_for_staff) VALUES (?, ?, ?)')
			.bind(classroom.id, classroom.profile, classroom.groupKeyForStaff)
	]);
	return kindergarten(db, admin);
}

export async function renameClassroom(db: D1Database, admin: Admin, id: string, profile: string) {
	await changesOne(
		db,
		db.prepare('UPDATE classrooms SET profile = ? WHERE id = ?').bind(profile, id)
	);
	return kindergarten(db, admin);
}

export async function deleteClassroom(db: D1Database, admin: Admin, id: string) {
	if (await db.prepare('SELECT 1 FROM children WHERE classroom_id = ?').bind(id).first()) {
		error(409, 'not-empty');
	}
	await changesOne(db, db.prepare('DELETE FROM classrooms WHERE id = ?').bind(id));
	return kindergarten(db, admin);
}

function assignments(db: D1Database, teacher: string, classrooms: string[]) {
	return classrooms.map((classroom) =>
		db
			.prepare('INSERT INTO teacher_classrooms (teacher_id, classroom_id) VALUES (?, ?)')
			.bind(teacher, classroom)
	);
}

export async function addTeacher(db: D1Database, admin: Admin, teacher: NewTeacher) {
	await transaction(db, [
		db
			.prepare('INSERT INTO teachers (id, admin, profile) VALUES (?, ?, ?)')
			.bind(teacher.id, Number(teacher.admin), teacher.profile),
		await insertCredential(db, { teacher: teacher.id }, teacher.credential),
		...assignments(db, teacher.id, teacher.classrooms)
	]);
	return kindergarten(db, admin);
}

export async function changeTeacher(
	db: D1Database,
	admin: Admin,
	id: string,
	change: TeacherChange
) {
	await found(db.prepare('SELECT 1 FROM teachers WHERE id = ?').bind(id));
	await transaction(db, [
		nextRevision(db, change.revision),
		db
			.prepare('UPDATE teachers SET admin = ?, profile = ? WHERE id = ?')
			.bind(Number(change.admin), change.profile, id),
		db.prepare('DELETE FROM teacher_classrooms WHERE teacher_id = ?').bind(id),
		...assignments(db, id, change.classrooms)
	]);
	return kindergarten(db, admin);
}

/** Removes a teacher with their card and sessions. The database refuses to remove the last admin. */
export async function removeTeacher(db: D1Database, admin: Admin, id: string) {
	await changesOne(db, db.prepare('DELETE FROM teachers WHERE id = ?').bind(id));
	return kindergarten(db, admin);
}

export async function replaceTeacherCard(
	db: D1Database,
	admin: Admin,
	id: string,
	credential: NewCredential
) {
	await found(db.prepare('SELECT 1 FROM teachers WHERE id = ?').bind(id));
	await replaceCard(db, { teacher: id }, credential);
	return kindergarten(db, admin);
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

/** Changes a child along with its family links. New families exist before the child refers to them. */
async function changeChildren(
	db: D1Database,
	admin: Admin,
	links: FamilyLinks,
	child: D1PreparedStatement
) {
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
		// With their cards, sessions, and remaining classrooms.
		...links.removeFamilies.map((family) =>
			db.prepare('DELETE FROM families WHERE id = ?').bind(family)
		)
	]);
	return kindergarten(db, admin);
}

export function addChild(db: D1Database, admin: Admin, child: NewChild) {
	return changeChildren(
		db,
		admin,
		child,
		db
			.prepare('INSERT INTO children (id, classroom_id, profile) VALUES (?, ?, ?)')
			.bind(child.id, child.classroom, child.profile)
	);
}

export async function changeChild(db: D1Database, admin: Admin, id: string, change: ChildChange) {
	await found(db.prepare('SELECT 1 FROM children WHERE id = ?').bind(id));
	return changeChildren(
		db,
		admin,
		change,
		db
			.prepare('UPDATE children SET classroom_id = ?, profile = ? WHERE id = ?')
			.bind(change.classroom, change.profile, id)
	);
}

export async function removeChild(db: D1Database, admin: Admin, id: string, links: FamilyLinks) {
	await found(db.prepare('SELECT 1 FROM children WHERE id = ?').bind(id));
	return changeChildren(db, admin, links, db.prepare('DELETE FROM children WHERE id = ?').bind(id));
}

export async function renameFamily(db: D1Database, admin: Admin, id: string, profile: string) {
	await changesOne(
		db,
		db.prepare('UPDATE families SET profile = ? WHERE id = ?').bind(profile, id)
	);
	return kindergarten(db, admin);
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
