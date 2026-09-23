import { error } from '@sveltejs/kit';
import type { Identity, Staff } from '$lib/api';

/**
 * Runs statements as one D1 batch, which D1 runs as a transaction, turning broken invariants into
 * conflicts the app can explain.
 */
export async function transaction(db: D1Database, statements: D1PreparedStatement[]) {
	try {
		return await db.batch(statements);
	} catch (cause) {
		const message = cause instanceof Error ? cause.message : '';
		if (message.includes('last-head')) error(409, 'last-head');
		// Two meetings offered over each other, in one classroom or for one teacher.
		if (message.includes('meeting-overlap')) error(409, 'meeting-overlap');
		// The records changed since the device read them, or something the change refers to is gone. A
		// statement that writes nothing where the schema insists on something says the same: a write made
		// conditional on records that have since moved leaves the column it depended on empty.
		if (
			message.includes('stale') ||
			message.includes('FOREIGN KEY constraint failed') ||
			message.includes('NOT NULL constraint failed')
		) {
			error(409, 'stale');
		}
		throw cause;
	}
}

/** Whether someone runs the whole kindergarten, which every check for a head's reach asks. */
export const isHead = (viewer: Identity) => viewer.kind === 'staff' && viewer.role === 'head';

/** Whether a subquery's results include every one of these IDs, which must each come once. */
export async function includesAll(
	db: D1Database,
	ids: string[],
	subquery: string,
	params: string[] = []
) {
	const row = await db
		.prepare(`SELECT COUNT(*) AS count FROM json_each(?) WHERE value IN (${subquery})`)
		.bind(JSON.stringify(ids), ...params)
		.first<{ count: number }>();
	return row?.count === ids.length;
}

/**
 * The classrooms whose board someone sees, with its notices and photo, as a subquery and its parameters: a
 * family its children's classrooms, a teacher or a group lead the ones she holds, and a head every classroom.
 */
export function visibleClassrooms(viewer: Identity): [string, string[]] {
	if (viewer.kind === 'family') {
		return ['SELECT classroom_id FROM family_classrooms WHERE family_id = ?', [viewer.family]];
	}
	if (isHead(viewer)) return ['SELECT id FROM classrooms', []];
	return ['SELECT classroom_id FROM teacher_classrooms WHERE teacher_id = ?', [viewer.teacher]];
}

/**
 * The families someone sees, as a subquery and its parameters: a family only itself, a teacher or a group lead
 * the families in her classrooms, and a head every family.
 */
export function visibleFamilies(viewer: Identity): [string, string[]] {
	if (viewer.kind === 'family') return ['SELECT ?', [viewer.family]];
	if (isHead(viewer)) return ['SELECT id FROM families', []];
	const [classrooms, params] = visibleClassrooms(viewer);
	return [`SELECT family_id FROM family_classrooms WHERE classroom_id IN (${classrooms})`, params];
}

/**
 * Whether a staff member settles what others put up in the classrooms she holds: notices, events and meeting
 * times. The head and a group lead do; a teacher changes only her own.
 */
export const managesOthers = (staff: Staff) => staff.role !== 'teacher';

/**
 * Refuses classrooms a staff member can't put notices or photos up in: the ones she holds, or any for a head.
 * Each classroom comes once. A device that offers another has records from before a classroom was deleted or
 * its teacher moved, so it's told to load them again.
 */
export async function checkClassrooms(db: D1Database, staff: Staff, classrooms: string[]) {
	if (!(await includesAll(db, classrooms, ...visibleClassrooms(staff)))) error(409, 'stale');
}
