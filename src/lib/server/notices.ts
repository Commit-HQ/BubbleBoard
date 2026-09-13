import { error } from '@sveltejs/kit';
import type {
	FamilyIdentity,
	Identity,
	NewNotice,
	NoticeChange,
	NoticeKey,
	NoticeRecord,
	PollAnswer,
	Staff,
	VoteRecord
} from '$lib/api';
import { day } from '$lib/notices';
import { checkClassrooms, transaction, visibleClassrooms } from './database';
import { deleteMarked, getObject, putObject, type ObjectStore } from './storage';

// The board: notices as envelopes, with the classrooms they're for (docs/access-format.md). The server
// can't read a notice, so it decides who sees and changes which. Teachers post to their own classrooms and
// admins to any; the author and admins change and delete a notice; everyone reads the notices of their
// classrooms, and admins those of every classroom. Families mark the notices they see as seen and answer
// their polls, which their teachers see, and which the notice's families see too when its poll shows the
// counts. A notice names the files it carries: their encrypted bytes are uploaded before it's saved, and
// deleted once it no longer names them. Reads leave out notices past their days, which the daily cleanup
// deletes with their files (cleanup.ts).

/**
 * The families whose marks and answers on notices someone sees, as a query and its parameters: a family
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
 * viewer sees. A family also gets the answers of every family a notice is for when its poll shows the counts,
 * which are encrypted with the poll's key.
 */
function boardQuery(db: D1Database, viewer: Identity) {
	const [families, familyParams] = visibleFamilies(viewer);
	const [classrooms, classroomParams] = visibleClassrooms(viewer);
	const counted =
		viewer.kind === 'family'
			? `OR (n.poll_counts AND family_id IN (SELECT fc.family_id FROM family_classrooms fc
			JOIN notice_classrooms c ON c.classroom_id = fc.classroom_id WHERE c.notice_id = n.id))`
			: '';
	// Parameters go in the order the query uses them.
	return db
		.prepare(
			`WITH visible_families AS (${families})
			SELECT n.id, n.teacher_id AS teacher, n.content, n.posted_at AS postedAt,
			n.announced_at AS announcedAt, n.edited_at AS editedAt, n.expires_at AS expiresAt,
			json_group_array(json_object('classroom', nc.classroom_id, 'noticeKey', nc.notice_key)) AS classrooms,
			(SELECT json_group_array(family_id) FROM notice_seen
			WHERE notice_id = n.id AND family_id IN (SELECT * FROM visible_families)) AS seen,
			(SELECT json_group_array(json_object('family', family_id, 'choice', choice)) FROM poll_votes
			WHERE notice_id = n.id AND (family_id IN (SELECT * FROM visible_families) ${counted})) AS votes
			FROM notices n JOIN notice_classrooms nc ON nc.notice_id = n.id
			WHERE n.expires_at > ? AND nc.classroom_id IN (${classrooms})
			GROUP BY n.id ORDER BY n.announced_at DESC, n.id`
		)
		.bind(...familyParams, Date.now(), ...classroomParams);
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

/** Changes the board and reads it back as the viewer sees it now, in one transaction. */
async function changeBoard(db: D1Database, viewer: Identity, statements: D1PreparedStatement[]) {
	const results = await transaction(db, [...statements, boardQuery(db, viewer)]);
	return readBoard(results[statements.length]);
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

/**
 * Names a notice's files, keeping those it names already. The database refuses a file that wasn't uploaded
 * for the notice or is on its way out (migrations/0008_notice_files.sql), and the device is told to load its
 * records again. Each file comes once (validate.ts).
 */
function insertFiles(db: D1Database, notice: string, files: string[]) {
	return files.map((file) =>
		db
			.prepare('INSERT INTO notice_files (notice_id, id) VALUES (?, ?) ON CONFLICT DO NOTHING')
			.bind(notice, file)
	);
}

export async function postNotice(db: D1Database, staff: Staff, notice: NewNotice) {
	await checkClassrooms(
		db,
		staff,
		notice.classrooms.map(({ classroom }) => classroom)
	);
	const now = Date.now();
	return changeBoard(db, staff, [
		db
			.prepare(
				'INSERT INTO notices (id, teacher_id, content, poll, poll_counts, posted_at, announced_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
			)
			.bind(
				notice.id,
				staff.teacher,
				notice.content,
				Number(notice.poll),
				Number(notice.counts),
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
	await checkClassrooms(
		db,
		staff,
		change.classrooms.map(({ classroom }) => classroom)
	);
	const now = Date.now();
	const records = await changeBoard(db, staff, [
		// Answers encrypted for families that see the counts, or for those that don't, go when that changes.
		db
			.prepare(
				'DELETE FROM poll_votes WHERE notice_id = ?1 AND (SELECT poll_counts FROM notices WHERE id = ?1) <> ?2'
			)
			.bind(id, Number(change.counts)),
		db
			.prepare(
				`UPDATE notices SET content = ?, poll = ?, poll_counts = ?, edited_at = ?, expires_at = ?,
				announced_at = CASE WHEN ? THEN ? ELSE announced_at END WHERE id = ?`
			)
			.bind(
				change.content,
				Number(change.poll),
				Number(change.counts),
				now,
				postedAt + change.days * day,
				Number(change.announce),
				now,
				id
			),
		// Every save seals the notice under a new key, so its old keys all go.
		db.prepare('DELETE FROM notice_classrooms WHERE notice_id = ?').bind(id),
		...insertKeys(db, id, change.classrooms),
		// The files the change leaves out go on their way out with their rows.
		db
			.prepare(
				'DELETE FROM notice_files WHERE notice_id = ? AND id NOT IN (SELECT value FROM json_each(?))'
			)
			.bind(id, JSON.stringify(change.files)),
		...insertFiles(db, id, change.files),
		// A change that notifies everyone again asks every family to see the notice again.
		db
			.prepare('DELETE FROM notice_seen WHERE ? AND notice_id = ?')
			.bind(Number(change.announce), id),
		// A poll taken off the notice takes its answers with it.
		db.prepare('DELETE FROM poll_votes WHERE NOT ? AND notice_id = ?').bind(Number(change.poll), id)
	]);
	await deleteMarked(db, bucket);
	return records;
}

/** Deletes a notice with its files. */
export async function deleteNotice(db: D1Database, bucket: R2Bucket, staff: Staff, id: string) {
	await changeable(db, staff, id);
	const records = await changeBoard(db, staff, [
		db.prepare('DELETE FROM notices WHERE id = ?').bind(id)
	]);
	await deleteMarked(db, bucket);
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

/**
 * A notice that's still up for one of the classrooms someone sees, whether it has a poll, and whether
 * families see the poll's counts.
 */
async function visibleNotice(db: D1Database, viewer: Identity, id: string) {
	const [classrooms, params] = visibleClassrooms(viewer);
	const notice = await db
		.prepare(
			`SELECT poll, poll_counts AS counts FROM notices WHERE id = ? AND expires_at > ? AND id IN
			(SELECT notice_id FROM notice_classrooms WHERE classroom_id IN (${classrooms}))`
		)
		.bind(id, Date.now(), ...params)
		.first<{ poll: number; counts: number }>();
	if (!notice) error(404, 'not-found');
	return { poll: notice.poll === 1, counts: notice.counts === 1 };
}

/** A notice file's encrypted bytes, while the notice is up and names it, for someone who sees the notice. */
export async function fileBytes(
	db: D1Database,
	store: ObjectStore,
	viewer: Identity,
	notice: string,
	file: string
) {
	const [classrooms, params] = visibleClassrooms(viewer);
	const named = await db
		.prepare(
			`SELECT 1 FROM notice_files f JOIN notices n ON n.id = f.notice_id
			WHERE f.notice_id = ? AND f.id = ? AND n.expires_at > ? AND f.notice_id IN
			(SELECT notice_id FROM notice_classrooms WHERE classroom_id IN (${classrooms}))`
		)
		.bind(notice, file, Date.now(), ...params)
		.first();
	if (!named) error(404, 'not-found');
	return getObject(db, store, fileKey(notice, file));
}

/** Marks a notice as seen by a family. Marking it again changes nothing. */
function seenBy(db: D1Database, family: FamilyIdentity, id: string) {
	return db
		.prepare('INSERT OR IGNORE INTO notice_seen (notice_id, family_id) VALUES (?, ?)')
		.bind(id, family.family);
}

/** Marks a notice as seen by a family that sees it, and returns the board as the family sees it now. */
export async function markSeen(db: D1Database, family: FamilyIdentity, id: string) {
	await visibleNotice(db, family, id);
	return changeBoard(db, family, [seenBy(db, family, id)]);
}

/**
 * Answers a notice's poll for a family that sees it, in place of its earlier answer, marks the notice as
 * seen, and returns the board as the family sees it now. A device that answers a notice without a poll, or
 * one whose counts it read the other way, has an outdated board, so it's told to load it again; an answer
 * that crosses a change to the counts isn't kept.
 */
export async function vote(db: D1Database, family: FamilyIdentity, id: string, answer: PollAnswer) {
	const { poll, counts } = await visibleNotice(db, family, id);
	if (!poll || counts !== answer.counts) error(409, 'stale');
	return changeBoard(db, family, [
		db
			.prepare(
				`INSERT INTO poll_votes (notice_id, family_id, choice)
				SELECT ?1, ?2, ?3 WHERE (SELECT poll_counts FROM notices WHERE id = ?1) = ?4
				ON CONFLICT (notice_id, family_id) DO UPDATE SET choice = ?3`
			)
			.bind(id, family.family, answer.choice, Number(answer.counts)),
		seenBy(db, family, id)
	]);
}
