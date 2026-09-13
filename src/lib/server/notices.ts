import { error } from '@sveltejs/kit';
import type {
	FamilyIdentity,
	Identity,
	NewNotice,
	NoticeChange,
	NoticeKey,
	NoticeRecord,
	Staff
} from '$lib/api';
import { day } from '$lib/notices';
import { includesAll, transaction } from './database';

// The board: notices as envelopes, with the classrooms they're for (docs/access-format.md). The server
// can't read a notice, so it decides who sees and changes which. Teachers post to their own classrooms and
// admins to any; the author and admins change and delete a notice; everyone reads the notices of their
// classrooms, and admins those of every classroom. Families mark the notices they see as seen, which their
// teachers see. Reads leave out notices past their days, which the daily cleanup deletes (push.ts).

/** The classrooms whose notices someone sees, as a subquery and its parameters. */
function visibleClassrooms(viewer: Identity): [string, string[]] {
	if (viewer.kind === 'family') {
		return ['SELECT classroom_id FROM family_classrooms WHERE family_id = ?', [viewer.family]];
	}
	if (viewer.admin) return ['SELECT id FROM classrooms', []];
	return ['SELECT classroom_id FROM teacher_classrooms WHERE teacher_id = ?', [viewer.teacher]];
}

/**
 * The families whose marks on notices someone sees, as a subquery and its parameters: a family only its
 * own, a teacher the families in their classrooms, and an admin every family.
 */
function visibleFamilies(viewer: Identity): [string, string[]] {
	if (viewer.kind === 'family') return ['SELECT ?', [viewer.family]];
	if (viewer.admin) return ['SELECT id FROM families', []];
	return [
		`SELECT family_id FROM family_classrooms WHERE classroom_id IN
		(SELECT classroom_id FROM teacher_classrooms WHERE teacher_id = ?)`,
		[viewer.teacher]
	];
}

/**
 * The notices someone sees that are still up, the most recently announced first. Each comes once, with its
 * key for every one of its classrooms the viewer sees, and the families the viewer sees that marked it.
 */
function boardQuery(db: D1Database, viewer: Identity) {
	const [classrooms, classroomParams] = visibleClassrooms(viewer);
	const [families, familyParams] = visibleFamilies(viewer);
	// Parameters go in the order the query uses them.
	return db
		.prepare(
			`SELECT n.id, n.teacher_id AS teacher, n.content, n.posted_at AS postedAt,
			n.announced_at AS announcedAt, n.edited_at AS editedAt, n.expires_at AS expiresAt,
			json_group_array(json_object('classroom', nc.classroom_id, 'noticeKey', nc.notice_key)) AS classrooms,
			(SELECT json_group_array(family_id) FROM notice_seen
			WHERE notice_id = n.id AND family_id IN (${families})) AS seen
			FROM notices n JOIN notice_classrooms nc ON nc.notice_id = n.id
			WHERE n.expires_at > ? AND nc.classroom_id IN (${classrooms})
			GROUP BY n.id ORDER BY n.announced_at DESC, n.id`
		)
		.bind(...familyParams, Date.now(), ...classroomParams);
}

/** The board's rows as notices. SQLite has no arrays, so each notice's keys and marks come as JSON. */
function readBoard({ results }: D1Result): NoticeRecord[] {
	type Row = Omit<NoticeRecord, 'classrooms' | 'seen'> & { classrooms: string; seen: string };
	return (results as Row[]).map((row) => ({
		...row,
		classrooms: JSON.parse(row.classrooms) as NoticeKey[],
		seen: JSON.parse(row.seen) as string[]
	}));
}

export async function board(db: D1Database, viewer: Identity) {
	return readBoard(await boardQuery(db, viewer).all());
}

/** Changes the board and reads it back as the staff member sees it now, in one transaction. */
async function changeBoard(db: D1Database, staff: Staff, statements: D1PreparedStatement[]) {
	const results = await transaction(db, [...statements, boardQuery(db, staff)]);
	return readBoard(results[statements.length]);
}

/**
 * Refuses a notice for classrooms its poster can't reach: a teacher's own, or any for an admin. Each
 * classroom comes once (validate.ts). A device that offers another has records from before a classroom was
 * deleted or its teacher moved, so it's told to load them again.
 */
async function checkClassrooms(db: D1Database, staff: Staff, keys: NoticeKey[]) {
	const classrooms = keys.map(({ classroom }) => classroom);
	if (!(await includesAll(db, classrooms, ...visibleClassrooms(staff)))) error(409, 'stale');
}

function insertKeys(db: D1Database, notice: string, keys: NoticeKey[]) {
	return keys.map(({ classroom, noticeKey }) =>
		db
			.prepare(
				'INSERT INTO notice_classrooms (notice_id, classroom_id, notice_key) VALUES (?, ?, ?)'
			)
			.bind(notice, classroom, noticeKey)
	);
}

export async function postNotice(db: D1Database, staff: Staff, notice: NewNotice) {
	await checkClassrooms(db, staff, notice.classrooms);
	const now = Date.now();
	return changeBoard(db, staff, [
		db
			.prepare(
				'INSERT INTO notices (id, teacher_id, content, posted_at, announced_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)'
			)
			.bind(notice.id, staff.teacher, notice.content, now, now, now + notice.days * day),
		...insertKeys(db, notice.id, notice.classrooms)
	]);
}

/** A notice that's still up and the staff member may change: their own, or any for an admin. */
async function changeable(db: D1Database, staff: Staff, id: string) {
	const notice = await db
		.prepare(
			'SELECT teacher_id AS teacher, posted_at AS postedAt FROM notices WHERE id = ? AND expires_at > ?'
		)
		.bind(id, Date.now())
		.first<{ teacher: string | null; postedAt: number }>();
	if (!notice) error(404, 'not-found');
	if (!staff.admin && notice.teacher !== staff.teacher) error(403, 'forbidden');
	return notice;
}

export async function changeNotice(db: D1Database, staff: Staff, id: string, change: NoticeChange) {
	const { postedAt } = await changeable(db, staff, id);
	await checkClassrooms(db, staff, change.classrooms);
	const now = Date.now();
	return changeBoard(db, staff, [
		db
			.prepare(
				`UPDATE notices SET content = ?, edited_at = ?, expires_at = ?,
				announced_at = CASE WHEN ? THEN ? ELSE announced_at END WHERE id = ?`
			)
			.bind(change.content, now, postedAt + change.days * day, Number(change.announce), now, id),
		// Every save seals the notice under a new key, so its old keys all go.
		db.prepare('DELETE FROM notice_classrooms WHERE notice_id = ?').bind(id),
		...insertKeys(db, id, change.classrooms),
		// A change that notifies everyone again asks every family to see the notice again.
		db
			.prepare('DELETE FROM notice_seen WHERE ? AND notice_id = ?')
			.bind(Number(change.announce), id)
	]);
}

export async function deleteNotice(db: D1Database, staff: Staff, id: string) {
	await changeable(db, staff, id);
	return changeBoard(db, staff, [db.prepare('DELETE FROM notices WHERE id = ?').bind(id)]);
}

/** A notice that's still up for one of the classrooms someone sees. */
async function visibleNotice(db: D1Database, viewer: Identity, id: string) {
	const [classrooms, params] = visibleClassrooms(viewer);
	const notice = await db
		.prepare(
			`SELECT 1 FROM notices WHERE id = ? AND expires_at > ? AND id IN
			(SELECT notice_id FROM notice_classrooms WHERE classroom_id IN (${classrooms}))`
		)
		.bind(id, Date.now(), ...params)
		.first();
	if (!notice) error(404, 'not-found');
}

/** Marks a notice as seen by a family that sees it. Marking it again changes nothing. */
export async function markSeen(db: D1Database, family: FamilyIdentity, id: string) {
	await visibleNotice(db, family, id);
	await transaction(db, [
		db
			.prepare('INSERT OR IGNORE INTO notice_seen (notice_id, family_id) VALUES (?, ?)')
			.bind(id, family.family)
	]);
}
