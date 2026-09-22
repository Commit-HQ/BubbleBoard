import { error } from '@sveltejs/kit';
import type { Identity } from '$lib/api';
import {
	chargesAllowance,
	defaultMonthlyLimit,
	defaultSchedule,
	messageClock,
	sendingAllowed,
	type ConversationRecord,
	type Inbox,
	type MessageRecord,
	type MessageSettings
} from '$lib/messages';
import { checkClassrooms, transaction, visibleClassrooms } from './database';
import type { Manager } from './session';
import { deleteMarked, getObject, putObject, type ObjectStore } from './storage';
import { fields, flag, invalid, list, revision } from './validate';

export const actor = (who: Identity) =>
	who.kind === 'family' ? `family:${who.family}` : `teacher:${who.teacher}`;

const clockTime = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
/** One weekday's sending hours, or nothing at all when the classroom takes no messages that day. */
function hours(value: unknown) {
	if (value === null) return null;
	const { start, end } = fields(value);
	if (
		typeof start !== 'string' ||
		typeof end !== 'string' ||
		!clockTime.test(start) ||
		!clockTime.test(end) ||
		start >= end
	)
		invalid();
	return { start: start as string, end: end as string };
}
export function parseSettings(classroom: string, body: Record<string, unknown>): MessageSettings {
	const monthlyLimit = body.monthlyLimit;
	if (
		!Number.isInteger(monthlyLimit) ||
		(monthlyLimit as number) < 1 ||
		(monthlyLimit as number) > 1000
	)
		invalid();
	// Five weekdays, always all five: a day the classroom is closed is there as nothing.
	const schedule = list(body.schedule, hours, 5);
	if (schedule.length !== 5) invalid();
	return {
		classroom,
		enabled: flag(body.enabled),
		monthlyLimit: monthlyLimit as number,
		revision: revision(body.revision),
		schedule
	};
}
type SettingsRow = {
	classroom: string;
	enabled: number;
	monthlyLimit: number;
	schedule: string;
	revision: number;
};
const settingsColumns =
	'classroom_id AS classroom, enabled, monthly_limit AS monthlyLimit, schedule, revision';
/** A classroom's settings as they're kept, or what a classroom nobody has settled yet starts from. */
function settingsOf(classroom: string, row?: SettingsRow): MessageSettings {
	return row
		? { ...row, classroom, enabled: !!row.enabled, schedule: JSON.parse(row.schedule) }
		: {
				classroom,
				enabled: false,
				monthlyLimit: defaultMonthlyLimit,
				schedule: defaultSchedule(),
				revision: 0
			};
}
export async function settingsFor(db: D1Database, classroom: string): Promise<MessageSettings> {
	const row = await db
		.prepare(`SELECT ${settingsColumns} FROM message_settings WHERE classroom_id = ?`)
		.bind(classroom)
		.first<SettingsRow>();
	return settingsOf(classroom, row ?? undefined);
}
/** Settles a classroom's messaging: the head anywhere, a group lead in the classrooms she holds. */
export async function saveSettings(db: D1Database, manager: Manager, value: MessageSettings) {
	await checkClassrooms(db, manager, [value.classroom]);
	const result = await db
		.prepare(
			`INSERT INTO message_settings(classroom_id,enabled,monthly_limit,schedule,revision)
 SELECT ?1,?2,?3,?4,1 WHERE ?5 = 0 AND EXISTS(SELECT 1 FROM classrooms WHERE id=?1)
 ON CONFLICT(classroom_id) DO NOTHING`
		)
		.bind(
			value.classroom,
			+value.enabled,
			value.monthlyLimit,
			JSON.stringify(value.schedule),
			value.revision
		)
		.run();
	if (result.meta.changes) return;
	const updated = await db
		.prepare(
			`UPDATE message_settings SET enabled=?,monthly_limit=?,schedule=?,revision=revision+1 WHERE classroom_id=? AND revision=?`
		)
		.bind(
			+value.enabled,
			value.monthlyLimit,
			JSON.stringify(value.schedule),
			value.classroom,
			value.revision
		)
		.run();
	if (!updated.meta.changes) error(409, 'stale');
}
async function checkAudience(db: D1Database, who: Identity, classroom: string, family: string) {
	const [sql, params] = visibleClassrooms(who);
	const row = await db
		.prepare(
			`SELECT 1 FROM family_classrooms WHERE family_id=? AND classroom_id=? AND classroom_id IN (${sql})`
		)
		.bind(family, classroom, ...params)
		.first();
	if (!row || (who.kind === 'family' && who.family !== family)) error(404, 'not-found');
}
/**
 * The conversation, if this device may see it: one statement asks for it and for the membership that makes
 * it visible, since a conversation nobody on this device belongs to is simply not there.
 */
export async function conversationFor(db: D1Database, who: Identity, id: string) {
	const [sql, params] = visibleClassrooms(who);
	const row = await db
		.prepare(
			`SELECT c.id,c.family_id AS family,c.classroom_id AS classroom,c.closed FROM conversations c
 JOIN family_classrooms f ON f.family_id=c.family_id AND f.classroom_id=c.classroom_id
 WHERE c.id=? AND c.classroom_id IN (${sql})`
		)
		.bind(id, ...params)
		.first<{ id: string; family: string; classroom: string; closed: number }>();
	if (!row || (who.kind === 'family' && who.family !== row.family)) error(404, 'not-found');
	return row;
}
/** What a family has spent of a classroom's monthly allowance: its classroom, family, and Zagreb month. */
const spent = `(SELECT COUNT(*) FROM messages m JOIN conversations c ON c.id=m.conversation_id
 WHERE c.classroom_id=? AND c.family_id=? AND m.charged=?)`;
/** Whether a teacher wrote the last message of a conversation, which makes the family's answer free. */
const answered = `COALESCE((SELECT substr(author,1,8)='teacher:' FROM messages
 WHERE conversation_id=? ORDER BY sequence DESC LIMIT 1),0)`;
/**
 * How far the other side has read a conversation, which is what tells a family whether one of its messages is
 * still its own to change: a teacher who has opened the conversation past a message has read it. Teachers read
 * one conversation each for themselves, so the furthest any of them reached is the one that counts; a family's
 * devices share one mark. A conversation nobody on the other side has opened yet counts as read to nothing.
 */
const seenSequence = (who: Identity) =>
	who.kind === 'family'
		? `COALESCE((SELECT MAX(sequence) FROM conversation_reads
 WHERE conversation_id=c.id AND substr(reader,1,8)='teacher:'),0)`
		: `COALESCE((SELECT sequence FROM conversation_reads
 WHERE conversation_id=c.id AND reader='family:'||c.family_id),0)`;
export async function inbox(db: D1Database, who: Identity, now = Date.now()): Promise<Inbox> {
	const [sql, params] = visibleClassrooms(who);
	const classrooms = await db
		.prepare(`SELECT id FROM classrooms WHERE id IN (${sql})`)
		.bind(...params)
		.all<{ id: string }>();
	// Every classroom's policy in two queries, whatever a head's kindergarten holds: what each classroom
	// settled, and what this family has spent in each of them this month.
	const settings = await db
		.prepare(`SELECT ${settingsColumns} FROM message_settings WHERE classroom_id IN (${sql})`)
		.bind(...params)
		.all<SettingsRow>();
	const rows = new Map(settings.results.map((row) => [row.classroom, row]));
	const spending =
		who.kind === 'family'
			? await db
					.prepare(
						`SELECT c.classroom_id AS classroom, COUNT(*) AS n
 FROM messages m JOIN conversations c ON c.id=m.conversation_id
 WHERE c.family_id=? AND m.charged=? GROUP BY c.classroom_id`
					)
					.bind(who.family, messageClock(now).month)
					.all<{ classroom: string; n: number }>()
			: { results: [] };
	const spentIn = new Map(spending.results.map(({ classroom, n }) => [classroom, n]));
	const policies = classrooms.results.map(({ id }) => ({
		...settingsOf(id, rows.get(id)),
		used: spentIn.get(id) ?? 0
	}));
	const { results } = await db
		.prepare(
			`SELECT c.id,c.family_id AS family,c.classroom_id AS classroom,c.title,c.closed,c.created_at AS createdAt,
 m.sequence AS lastSequence,COALESCE(r.sequence,0) AS readSequence,${seenSequence(who)} AS seenSequence,
 m.content,m.id AS messageId,m.author,m.posted_at AS postedAt,m.edited_at AS editedAt,m.deleted_at AS deletedAt
 FROM conversations c JOIN messages m ON m.sequence=(SELECT MAX(sequence) FROM messages WHERE conversation_id=c.id)
 LEFT JOIN conversation_reads r ON r.conversation_id=c.id AND r.reader=?
 WHERE c.classroom_id IN (${sql}) ${who.kind === 'family' ? 'AND c.family_id=?' : ''}
 ORDER BY m.sequence DESC`
		)
		.bind(actor(who), ...params, ...(who.kind === 'family' ? [who.family] : []))
		.all<ConversationRecord>();
	return { conversations: results, policies, family: who.kind === 'family' ? who.family : null };
}
// All mutable policy and audience checks also occur inside the INSERT, so concurrent sends/settings changes
// cannot overspend a quota or append after a conversation closes. The server supplies local time, never the client.
// With `conversation`, the message answers one, and is free while a teacher's message is its last.
function guard(
	who: Identity,
	classroom: string,
	family: string,
	now: number,
	conversation?: string
) {
	const [sql, params] = visibleClassrooms(who);
	let condition = `EXISTS(SELECT 1 FROM family_classrooms WHERE classroom_id=? AND family_id=? AND classroom_id IN (${sql}))`;
	const values: (string | number)[] = [classroom, family, ...params];
	if (who.kind === 'family') {
		const clock = messageClock(now);
		condition += ` AND EXISTS(SELECT 1 FROM message_settings p WHERE p.classroom_id=? AND p.enabled=1
   AND json_extract(p.schedule,?) <= ? AND json_extract(p.schedule,?) > ?
   AND (${conversation ? `${answered} OR ` : ''}${spent} < p.monthly_limit))`;
		values.push(classroom, `$[${clock.day}].start`, clock.time, `$[${clock.day}].end`, clock.time);
		if (conversation) values.push(conversation);
		values.push(classroom, family, clock.month);
	}
	return { condition, values };
}
/** Where R2 keeps a file attached to a message, as named_objects names it (migrations/). */
const fileKey = (message: string, file: string) => `messages/${message}/${file}`;

/**
 * Names the files a message carries, once the message itself is there: a send the policy refused, or an
 * identical retry, names none. The database refuses a file that wasn't uploaded for the message or is on its
 * way out (migrations/0020_message_files.sql), which fails the whole send as stale. Each file comes once
 * (validate.ts). Files no message names are deleted in the daily cleanup a day later.
 */
function insertFiles(db: D1Database, message: string, files: string[]) {
	return files.map((file) =>
		db
			.prepare(
				`INSERT INTO message_files(message_id,id) SELECT ?,? WHERE EXISTS(SELECT 1 FROM messages WHERE id=?)
 ON CONFLICT DO NOTHING`
			)
			.bind(message, file, message)
	);
}

/** Only staff attach files; a family's inquiry carries its words alone. */
function checkAttaching(who: Identity, files: string[]) {
	if (files.length && who.kind !== 'staff') error(403, 'forbidden');
}

/**
 * Stores the encrypted bytes of a file a teacher attaches, before the message naming it is sent, for staff
 * who may write in the conversation. A message that exists already must be that staff member's own in it, so
 * a send that lost its answer can upload the same bytes again, which `putObject` then refuses as `stored`.
 */
export async function uploadMessageFile(
	db: D1Database,
	store: ObjectStore,
	who: Identity,
	conversation: string,
	message: string,
	file: string,
	bytes: Uint8Array<ArrayBuffer>
) {
	if (who.kind !== 'staff') error(403, 'forbidden');
	await conversationFor(db, who, conversation);
	const row = await db
		.prepare('SELECT conversation_id AS conversation,author FROM messages WHERE id=?')
		.bind(message)
		.first<{ conversation: string; author: string }>();
	if (row && (row.conversation !== conversation || row.author !== actor(who)))
		error(403, 'forbidden');
	await putObject(db, store, fileKey(message, file), bytes);
}

/** A file's encrypted bytes, for a device that may read the conversation whose message carries it. */
export async function messageFileBytes(
	db: D1Database,
	store: ObjectStore,
	who: Identity,
	conversation: string,
	message: string,
	file: string
) {
	await conversationFor(db, who, conversation);
	const named = await db
		.prepare(
			`SELECT 1 FROM message_files f JOIN messages m ON m.id=f.message_id
 WHERE f.message_id=? AND f.id=? AND m.conversation_id=?`
		)
		.bind(message, file, conversation)
		.first();
	if (!named) error(404, 'not-found');
	return getObject(db, store, fileKey(message, file));
}
export type NewConversation = {
	id: string;
	classroom: string;
	family: string;
	title: string;
	message: string;
	content: string;
	/** The files the first message carries; only a teacher may attach any. */
	files?: string[];
};
export async function startConversation(
	db: D1Database,
	who: Identity,
	value: NewConversation,
	now = Date.now()
) {
	await checkAudience(db, who, value.classroom, value.family);
	checkAttaching(who, value.files ?? []);
	const existing = await db
		.prepare('SELECT title FROM conversations WHERE id=?')
		.bind(value.id)
		.first<{ title: string }>();
	if (existing) {
		const thread = await conversationFor(db, who, value.id);
		const first = await db
			.prepare(
				'SELECT id,author,content FROM messages WHERE conversation_id=? ORDER BY sequence LIMIT 1'
			)
			.bind(value.id)
			.first<{ id: string; author: string; content: string }>();
		if (
			thread.classroom !== value.classroom ||
			thread.family !== value.family ||
			existing.title !== value.title ||
			first?.id !== value.message ||
			first.author !== actor(who) ||
			first.content !== value.content
		)
			error(409, 'stale');
		return false;
	}
	const { condition, values } = guard(who, value.classroom, value.family, now);
	const results = await transaction(db, [
		db
			.prepare(
				`INSERT INTO conversations(id,family_id,classroom_id,title,created_at)
   SELECT ?,?,?,?,? WHERE ${condition} ON CONFLICT(id) DO NOTHING`
			)
			.bind(value.id, value.family, value.classroom, value.title, now, ...values),
		db
			.prepare(
				`INSERT INTO messages(id,conversation_id,author,content,posted_at,charged)
   SELECT ?,?,?,?,?,? WHERE changes()=1`
			)
			.bind(
				value.message,
				value.id,
				actor(who),
				value.content,
				now,
				// Starting a conversation always spends one of the family's allowance.
				who.kind === 'family' ? messageClock(now).month : null
			),
		...insertFiles(db, value.message, value.files ?? [])
	]);
	if (!results[0].meta.changes) {
		// An identical retry may have committed while this request checked. Verify it rather than charge again.
		const committed = await db
			.prepare('SELECT id FROM conversations WHERE id=?')
			.bind(value.id)
			.first();
		if (committed) return startConversation(db, who, value, now);
		await explainBlocked(db, who, value.classroom, value.family, now, true);
	}
	return true;
}
/** Whether a family's next message in a conversation would spend one of its month's allowance. */
async function charges(db: D1Database, conversation: string) {
	const last = await db
		.prepare('SELECT author FROM messages WHERE conversation_id=? ORDER BY sequence DESC LIMIT 1')
		.bind(conversation)
		.first<{ author: string }>();
	return chargesAllowance(last?.author);
}
async function explainBlocked(
	db: D1Database,
	who: Identity,
	classroom: string,
	family: string,
	now: number,
	charged: boolean
): Promise<never> {
	await checkAudience(db, who, classroom, family);
	if (who.kind === 'family') {
		const settings = await settingsFor(db, classroom);
		if (!settings.enabled) error(409, 'messages-disabled');
		if (!sendingAllowed(settings, now)) error(409, 'messages-hours');
		if (charged) error(409, 'messages-limit');
	}
	// Nothing the policy explains: the family left the classroom, or a teacher lost it, between the check
	// and the write. The app loads what's there now and says so.
	error(409, 'stale');
}
export async function reply(
	db: D1Database,
	who: Identity,
	id: string,
	message: string,
	content: string,
	files: string[] = [],
	now = Date.now()
) {
	const thread = await conversationFor(db, who, id);
	checkAttaching(who, files);
	const existing = await db
		.prepare('SELECT conversation_id AS conversation,author,content FROM messages WHERE id=?')
		.bind(message)
		.first<{ conversation: string; author: string; content: string }>();
	if (existing) {
		if (
			existing.conversation !== id ||
			existing.author !== actor(who) ||
			existing.content !== content
		)
			error(409, 'stale');
		return false;
	}
	// A family's message is free while a teacher's is the conversation's last; the CASE decides that with
	// the insert, so a teacher's answer arriving meanwhile can't be charged for.
	const fromFamily = who.kind === 'family';
	const charge = fromFamily ? `CASE WHEN ${answered} THEN NULL ELSE ? END` : 'NULL';
	const month = fromFamily ? [id, messageClock(now).month] : [];
	const { condition, values } = guard(who, thread.classroom, thread.family, now, id);
	const [result] = await transaction(db, [
		db
			.prepare(
				`INSERT INTO messages(id,conversation_id,author,content,posted_at,charged)
 SELECT ?,?,?,?,?,${charge} WHERE EXISTS(SELECT 1 FROM conversations WHERE id=? AND closed=0) AND ${condition}
 ON CONFLICT(id) DO NOTHING`
			)
			.bind(message, id, actor(who), content, now, ...month, id, ...values),
		...insertFiles(db, message, files)
	]);
	if (!result.meta.changes) {
		if (await db.prepare('SELECT id FROM messages WHERE id=?').bind(message).first())
			return reply(db, who, id, message, content, files, now);
		const closed = await db
			.prepare('SELECT closed FROM conversations WHERE id=? AND closed=1')
			.bind(id)
			.first();
		if (closed) error(409, 'messages-closed');
		await explainBlocked(db, who, thread.classroom, thread.family, now, await charges(db, id));
	}
	return true;
}
export async function readMessages(
	db: D1Database,
	who: Identity,
	id: string,
	before = Number.MAX_SAFE_INTEGER
) {
	await conversationFor(db, who, id);
	const { results } = await db
		.prepare(
			`SELECT id,sequence,author,content,posted_at AS postedAt,edited_at AS editedAt,deleted_at AS deletedAt
 FROM messages WHERE conversation_id=? AND sequence<? ORDER BY sequence DESC LIMIT 50`
		)
		.bind(id, before)
		.all<MessageRecord>();
	return results.reverse();
}
export async function markRead(db: D1Database, who: Identity, id: string, sequence: number) {
	await conversationFor(db, who, id);
	await db
		.prepare(
			`INSERT INTO conversation_reads(conversation_id,reader,sequence)
 SELECT ?,?,sequence FROM messages WHERE conversation_id=? AND sequence=?
 ON CONFLICT(conversation_id,reader) DO UPDATE SET sequence=MAX(sequence,excluded.sequence)`
		)
		.bind(id, actor(who), id, sequence)
		.run();
}
/**
 * A message of an open conversation is only its author's to change, only while it's still there, and only
 * until the other side answers it: an answer is to the words that were there, so changing or deleting them
 * afterwards would leave it answering nothing. Authors are `family:…` and `teacher:…`, whose first seven
 * letters tell the two sides apart.
 */
const ownMessage = `id=? AND conversation_id=? AND author=? AND deleted_at IS NULL
 AND EXISTS(SELECT 1 FROM conversations WHERE id=? AND closed=0)
 AND NOT EXISTS(SELECT 1 FROM messages n WHERE n.conversation_id=messages.conversation_id
 AND n.sequence>messages.sequence AND substr(n.author,1,7)<>substr(messages.author,1,7))`;
/**
 * A family's message stops being its own to change once a teacher has opened the conversation as far as it:
 * what a teacher has read has been read, and taking the words out from under them would leave the two sides
 * remembering different conversations. The condition sits in the change itself, so a teacher opening the
 * conversation at that moment wins rather than leaving a gap between the check and the write.
 */
const unseenMessage = `NOT EXISTS(SELECT 1 FROM conversation_reads r
 WHERE r.conversation_id=messages.conversation_id AND substr(r.reader,1,8)='teacher:'
 AND r.sequence>=messages.sequence)`;
/**
 * Why a change to one message wrote nothing: everything the change insisted on, asked again, so the device is
 * told what actually stands rather than a bare refusal. Reaching the end means the conversation moved under a
 * page written before it did, which loading it again shows.
 */
async function explainMessageChange(
	db: D1Database,
	who: Identity,
	conversation: string,
	message: string
): Promise<never> {
	const row = await db
		.prepare(
			'SELECT sequence,author,deleted_at AS deletedAt FROM messages WHERE id=? AND conversation_id=?'
		)
		.bind(message, conversation)
		.first<{ sequence: number; author: string; deletedAt: number | null }>();
	if (!row) error(404, 'not-found');
	if (row.author !== actor(who)) error(403, 'forbidden');
	const closed = await db
		.prepare('SELECT 1 FROM conversations WHERE id=? AND closed=1')
		.bind(conversation)
		.first();
	if (closed) error(409, 'messages-closed');
	if (who.kind === 'family' && !row.deletedAt) {
		const seen = await db
			.prepare(
				`SELECT 1 FROM conversation_reads WHERE conversation_id=?
 AND substr(reader,1,8)='teacher:' AND sequence>=?`
			)
			.bind(conversation, row.sequence)
			.first();
		if (seen) error(409, 'message-seen');
	}
	if (!row.deletedAt) {
		const answered = await db
			.prepare(
				`SELECT 1 FROM messages WHERE conversation_id=? AND sequence>? AND substr(author,1,7)<>?`
			)
			.bind(conversation, row.sequence, row.author.slice(0, 7))
			.first();
		if (answered) error(409, 'message-answered');
	}
	error(409, 'stale');
}
/**
 * Changes the words of a message its author already sent. Only the text changes: the files it carries stay as
 * they are, which is why the client seals the same envelope again with the new text and the server never sees
 * a files list here. An edit spends no allowance, since the message it changes already spent what it cost.
 * Once the other side has answered, the message stays as it was answered (`ownMessage`).
 */
export async function editMessage(
	db: D1Database,
	who: Identity,
	conversation: string,
	message: string,
	content: string,
	now = Date.now()
) {
	await conversationFor(db, who, conversation);
	const result = await db
		.prepare(
			`UPDATE messages SET content=?,edited_at=? WHERE ${ownMessage}
 ${who.kind === 'family' ? `AND ${unseenMessage}` : ''}`
		)
		.bind(content, now, message, conversation, actor(who), conversation)
		.run();
	if (!result.meta.changes) await explainMessageChange(db, who, conversation, message);
}
/**
 * Takes one of a teacher's own messages away. The row stays where it is, so the conversation's order, its
 * sequences, and both sides' read progress are untouched; its ciphertext is gone, and the files it carried go
 * with it, as deleting the whole inquiry frees them. The app shows the placeholder in the bubble's place.
 * Families delete nothing: a message a teacher may already have acted on doesn't disappear.
 */
export async function deleteMessage(
	db: D1Database,
	store: ObjectStore,
	who: Identity,
	conversation: string,
	message: string,
	now = Date.now()
) {
	if (who.kind !== 'staff') error(403, 'forbidden');
	await conversationFor(db, who, conversation);
	const [result] = await transaction(db, [
		db
			.prepare(`UPDATE messages SET content='',deleted_at=? WHERE ${ownMessage}`)
			.bind(now, message, conversation, actor(who), conversation),
		// Only when the message was actually emptied, so a refused delete leaves its files where they are.
		db.prepare('DELETE FROM message_files WHERE message_id=? AND changes()=1').bind(message)
	]);
	if (!result.meta.changes) await explainMessageChange(db, who, conversation, message);
	// Its file rows are gone, so their bytes are on their way out (migrations/0020_message_files.sql).
	await deleteMarked(db, store.bucket);
}
export async function closeConversation(db: D1Database, who: Identity, id: string) {
	if (who.kind !== 'staff') error(403, 'forbidden');
	await conversationFor(db, who, id);
	const [sql, params] = visibleClassrooms(who);
	await db
		.prepare(`UPDATE conversations SET closed=1 WHERE id=? AND classroom_id IN (${sql})`)
		.bind(id, ...params)
		.run();
}
/**
 * Takes a closed inquiry away for good: its messages and both sides' read progress go with it
 * (migrations/0015_messages.sql), and so does the family's copy, since both sides read the one record. Only a
 * closed one, so a conversation can't disappear under a family still writing in it. What the family spent on
 * it returns to that month's allowance, which is what the messages it spent them on no longer being there means.
 */
export async function deleteConversation(
	db: D1Database,
	store: ObjectStore,
	who: Identity,
	id: string
) {
	if (who.kind !== 'staff') error(403, 'forbidden');
	await conversationFor(db, who, id);
	const [sql, params] = visibleClassrooms(who);
	const result = await db
		.prepare(`DELETE FROM conversations WHERE id=? AND closed=1 AND classroom_id IN (${sql})`)
		.bind(id, ...params)
		.run();
	// It's there and this device may see it, so nothing deleted means it isn't closed: the device asked from
	// a page written before someone reopened the question, and loading the inbox again shows what's there now.
	if (!result.meta.changes) error(409, 'stale');
	// Its messages went with it, so the bytes of the files they carried are on their way out.
	await deleteMarked(db, store.bucket);
}
