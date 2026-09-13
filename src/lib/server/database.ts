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
		if (message.includes('last-admin')) error(409, 'last-admin');
		// The records changed since the device read them, or something the change refers to is gone.
		if (message.includes('stale') || message.includes('FOREIGN KEY constraint failed')) {
			error(409, 'stale');
		}
		throw cause;
	}
}

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
 * family its children's classrooms, a teacher their own, and an admin every classroom.
 */
export function visibleClassrooms(viewer: Identity): [string, string[]] {
	if (viewer.kind === 'family') {
		return ['SELECT classroom_id FROM family_classrooms WHERE family_id = ?', [viewer.family]];
	}
	if (viewer.admin) return ['SELECT id FROM classrooms', []];
	return ['SELECT classroom_id FROM teacher_classrooms WHERE teacher_id = ?', [viewer.teacher]];
}

/**
 * Refuses classrooms a staff member can't put notices or photos up in: a teacher's own, or any for an admin.
 * Each classroom comes once. A device that offers another has records from before a classroom was deleted or
 * its teacher moved, so it's told to load them again.
 */
export async function checkClassrooms(db: D1Database, staff: Staff, classrooms: string[]) {
	if (!(await includesAll(db, classrooms, ...visibleClassrooms(staff)))) error(409, 'stale');
}
