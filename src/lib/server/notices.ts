import { error } from '@sveltejs/kit';
import type {
	FamilyIdentity,
	Identity,
	NewNotice,
	NoticeChange,
	NoticeKey,
	NoticeRecord,
	Staff,
	VoteRecord
} from '$lib/api';
import { day } from '$lib/notices';
import { includesAll, transaction, visibleClassrooms } from './database';
import { deleteUnnamed, getObject, putObject, type ObjectStore } from './storage';

// The board: notices as envelopes, with the classrooms they're for (docs/access-format.md). The server
// can't read a notice, so it decides who sees and changes which. Teachers post to their own classrooms and
// admins to any; the author and admins change and delete a notice; everyone reads the notices of their
// classrooms, and admins those of every classroom. Families mark the notices they see as seen and answer
// their polls, which their teachers see. A notice names the files it carries: their encrypted bytes are
// uploaded before it's saved, and deleted once it no longer names them. Reads leave out notices past their
// days, which the daily cleanup deletes with their files (cleanup.ts).

/**
 * The families whose marks and answers on notices someone sees, as a subquery and its parameters: a family
 * only its own, a teacher the families in their classrooms, and an admin every family.
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
 * key for every one of its classrooms the viewer sees, and the marks and poll answers of the families the
 * viewer sees.
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
			WHERE notice_id = n.id AND family_id IN (${families})) AS seen,
			(SELECT json_group_array(json_object('family', family_id, 'choice', choice)) FROM poll_votes
			WHERE notice_id = n.id AND family_id IN (${families})) AS votes
			FROM notices n JOIN notice_classrooms nc ON nc.notice_id = n.id
			WHERE n.expires_at > ? AND nc.classroom_id IN (${classrooms})
			GROUP BY n.id ORDER BY n.announced_at DESC, n.id`
		)
		.bind(...familyParams, ...familyParams, Date.now(), ...classroomParams);
}

/** The board's rows as notices. SQLite has no arrays, so each notice's lists come as JSON. */
function readBoard({ results }: D1Result): NoticeRecord[] {
	type Lists = 'classrooms' | 'seen' | 'votes';
	type Row = Omit<NoticeRecord, Lists> & Record<Lists, string>;
	return (results as Row[]).map((row) => ({
		...row,
		classrooms: JSON.parse(row.classrooms) as NoticeKey[],
		seen: JSON.parse(row.seen) as string[],
		votes: JSON.parse(row.votes) as VoteRecord[]
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

/** Where R2 keeps a notice's file, as named_objects names it (migrations/). */
function fileKey(notice: string, file: string) {
	return `notices/${notice}/${file}`;
}

/** The keys of the files a notice names now. */
async function fileKeys(db: D1Database, notice: string) {
	const { results } = await db
		.prepare('SELECT id FROM notice_files WHERE notice_id = ?')
		.bind(notice)
		.all<{ id: string }>();
	return results.map(({ id }) => fileKey(notice, id));
}

/** The keys of the files on a classroom's notices, those it shares with other classrooms included. */
export async function classroomFileKeys(db: D1Database, classroom: string) {
	const { results } = await db
		.prepare(
			`SELECT notice_id AS notice, id FROM notice_files WHERE notice_id IN
			(SELECT notice_id FROM notice_classrooms WHERE classroom_id = ?)`
		)
		.bind(classroom)
		.all<{ notice: string; id: string }>();
	return results.map(({ notice, id }) => fileKey(notice, id));
}

/**
 * Names a notice's files. The database refuses a file that wasn't uploaded for the notice or is on its way
 * out (migrations/0008_notice_files.sql), and the device is told to load its records again. Each file comes
 * once (validate.ts).
 */
function insertFiles(db: D1Database, notice: string, files: string[]) {
	return files.map((file) =>
		db.prepare('INSERT INTO notice_files (notice_id, id) VALUES (?, ?)').bind(notice, file)
	);
}

export async function postNotice(db: D1Database, staff: Staff, notice: NewNotice) {
	await checkClassrooms(db, staff, notice.classrooms);
	const now = Date.now();
	return changeBoard(db, staff, [
		db
			.prepare(
				'INSERT INTO notices (id, teacher_id, content, poll, posted_at, announced_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
			)
			.bind(
				notice.id,
				staff.teacher,
				notice.content,
				Number(notice.poll),
				now,
				now,
				now + notice.days * day
			),
		...insertKeys(db, notice.id, notice.classrooms),
		...insertFiles(db, notice.id, notice.files)
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

/** Changes a notice, and deletes the files the change leaves out. */
export async function changeNotice(
	db: D1Database,
	bucket: R2Bucket,
	staff: Staff,
	id: string,
	change: NoticeChange
) {
	const { postedAt } = await changeable(db, staff, id);
	await checkClassrooms(db, staff, change.classrooms);
	const files = await fileKeys(db, id);
	const now = Date.now();
	const records = await changeBoard(db, staff, [
		db
			.prepare(
				`UPDATE notices SET content = ?, poll = ?, edited_at = ?, expires_at = ?,
				announced_at = CASE WHEN ? THEN ? ELSE announced_at END WHERE id = ?`
			)
			.bind(
				change.content,
				Number(change.poll),
				now,
				postedAt + change.days * day,
				Number(change.announce),
				now,
				id
			),
		// Every save seals the notice under a new key, so its old keys all go.
		db.prepare('DELETE FROM notice_classrooms WHERE notice_id = ?').bind(id),
		...insertKeys(db, id, change.classrooms),
		db.prepare('DELETE FROM notice_files WHERE notice_id = ?').bind(id),
		...insertFiles(db, id, change.files),
		// A change that notifies everyone again asks every family to see the notice again.
		db
			.prepare('DELETE FROM notice_seen WHERE ? AND notice_id = ?')
			.bind(Number(change.announce), id),
		// A poll taken off the notice takes its answers with it.
		db.prepare('DELETE FROM poll_votes WHERE NOT ? AND notice_id = ?').bind(Number(change.poll), id)
	]);
	await deleteUnnamed(db, bucket, files);
	return records;
}

/** Deletes a notice with its files. */
export async function deleteNotice(db: D1Database, bucket: R2Bucket, staff: Staff, id: string) {
	await changeable(db, staff, id);
	const files = await fileKeys(db, id);
	const records = await changeBoard(db, staff, [
		db.prepare('DELETE FROM notices WHERE id = ?').bind(id)
	]);
	await deleteUnnamed(db, bucket, files);
	return records;
}

/**
 * Stores a file's encrypted bytes for a notice about to be posted or changed, which names the file when it's
 * saved. A notice that's up takes files only from those who may change it, and a file stored already is
 * refused as `stored`. Files no notice names are deleted in the daily cleanup a day later.
 */
export async function uploadFile(
	db: D1Database,
	store: ObjectStore,
	staff: Staff,
	notice: string,
	file: string,
	bytes: Uint8Array<ArrayBuffer>
) {
	if (await db.prepare('SELECT 1 FROM notices WHERE id = ?').bind(notice).first()) {
		await changeable(db, staff, notice);
	}
	await putObject(db, store, fileKey(notice, file), bytes);
}

/** A notice that's still up for one of the classrooms someone sees, and whether it has a poll. */
async function visibleNotice(db: D1Database, viewer: Identity, id: string) {
	const [classrooms, params] = visibleClassrooms(viewer);
	const notice = await db
		.prepare(
			`SELECT poll FROM notices WHERE id = ? AND expires_at > ? AND id IN
			(SELECT notice_id FROM notice_classrooms WHERE classroom_id IN (${classrooms}))`
		)
		.bind(id, Date.now(), ...params)
		.first<{ poll: number }>();
	if (!notice) error(404, 'not-found');
	return { poll: notice.poll === 1 };
}

/** A notice file's encrypted bytes, while the notice is up and names it, for someone who sees the notice. */
export async function fileBytes(
	db: D1Database,
	store: ObjectStore,
	viewer: Identity,
	notice: string,
	file: string
) {
	await visibleNotice(db, viewer, notice);
	const named = await db
		.prepare('SELECT 1 FROM notice_files WHERE notice_id = ? AND id = ?')
		.bind(notice, file)
		.first();
	const body = named && (await getObject(db, store, fileKey(notice, file)));
	if (!body) error(404, 'not-found');
	return body;
}

/** Marks a notice as seen by a family. Marking it again changes nothing. */
function seenBy(db: D1Database, family: FamilyIdentity, id: string) {
	return db
		.prepare('INSERT OR IGNORE INTO notice_seen (notice_id, family_id) VALUES (?, ?)')
		.bind(id, family.family);
}

/** Marks a notice as seen by a family that sees it. */
export async function markSeen(db: D1Database, family: FamilyIdentity, id: string) {
	await visibleNotice(db, family, id);
	await transaction(db, [seenBy(db, family, id)]);
}

/**
 * Answers a notice's poll for a family that sees it, in place of its earlier answer, and marks the notice
 * as seen. A device that answers a notice without a poll has an outdated board, so it's told to load it again.
 */
export async function vote(db: D1Database, family: FamilyIdentity, id: string, choice: string) {
	const { poll } = await visibleNotice(db, family, id);
	if (!poll) error(409, 'stale');
	await transaction(db, [
		db
			.prepare(
				`INSERT INTO poll_votes (notice_id, family_id, choice) VALUES (?1, ?2, ?3)
				ON CONFLICT (notice_id, family_id) DO UPDATE SET choice = ?3`
			)
			.bind(id, family.family, choice),
		seenBy(db, family, id)
	]);
}
