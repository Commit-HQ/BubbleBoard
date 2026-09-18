import { error } from '@sveltejs/kit';
import type { Identity } from '$lib/api';
import { envelopeSize, isId } from '$lib/crypto';
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
import { visibleClassrooms } from './database';
import type { Admin } from './session';

export const actor = (who: Identity) =>
	who.kind === 'family' ? `family:${who.family}` : `teacher:${who.teacher}`;
const invalid = (): never => error(400, 'invalid');
export function messageId(value: unknown): string {
	return isId(value) ? value : invalid();
}
export function sealed(value: unknown, max = 18000): string {
	const size = envelopeSize(value);
	return typeof value === 'string' && size !== undefined && size > 0 && size <= max
		? value
		: invalid();
}
export function parseSettings(classroom: string, body: Record<string, unknown>): MessageSettings {
	if (
		typeof body.enabled !== 'boolean' ||
		!Number.isInteger(body.monthlyLimit) ||
		Number(body.monthlyLimit) < 1 ||
		Number(body.monthlyLimit) > 1000 ||
		!Number.isInteger(body.revision) ||
		Number(body.revision) < 0 ||
		!Array.isArray(body.schedule) ||
		body.schedule.length !== 5
	)
		invalid();
	const schedule = (body.schedule as unknown[]).map((entry) => {
		if (entry === null) return null;
		if (!entry || typeof entry !== 'object') return invalid();
		const { start, end } = entry as Record<string, unknown>;
		const time = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
		if (
			typeof start !== 'string' ||
			typeof end !== 'string' ||
			!time.test(start) ||
			!time.test(end) ||
			start >= end
		)
			return invalid();
		return { start, end };
	});
	return {
		classroom,
		enabled: body.enabled as boolean,
		monthlyLimit: body.monthlyLimit as number,
		revision: body.revision as number,
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
export async function saveSettings(db: D1Database, admin: Admin, value: MessageSettings) {
	if (!admin.admin) error(403, 'forbidden');
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
export async function conversationFor(db: D1Database, who: Identity, id: string) {
	const row = await db
		.prepare(
			'SELECT id,family_id AS family,classroom_id AS classroom,closed FROM conversations WHERE id=?'
		)
		.bind(id)
		.first<{ id: string; family: string; classroom: string; closed: number }>();
	if (!row) error(404, 'not-found');
	await checkAudience(db, who, row.classroom, row.family);
	return row;
}
/** What a family has spent of a classroom's monthly allowance: its classroom, family, and Zagreb month. */
const spent = `(SELECT COUNT(*) FROM messages m JOIN conversations c ON c.id=m.conversation_id
 WHERE c.classroom_id=? AND c.family_id=? AND m.charged=?)`;
/** Whether a teacher wrote the last message of a conversation, which makes the family's answer free. */
const answered = `COALESCE((SELECT substr(author,1,8)='teacher:' FROM messages
 WHERE conversation_id=? ORDER BY sequence DESC LIMIT 1),0)`;
export async function inbox(db: D1Database, who: Identity, now = Date.now()): Promise<Inbox> {
	const [sql, params] = visibleClassrooms(who);
	const classrooms = await db
		.prepare(`SELECT id FROM classrooms WHERE id IN (${sql})`)
		.bind(...params)
		.all<{ id: string }>();
	// Every classroom's policy in two queries, whatever an admin's kindergarten holds: what each classroom
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
	const policies = classrooms.results.map(({ id }) => {
		const policy = settingsOf(id, rows.get(id));
		return { ...policy, used: spentIn.get(id) ?? 0, allowed: sendingAllowed(policy, now) };
	});
	const { results } = await db
		.prepare(
			`SELECT c.id,c.family_id AS family,c.classroom_id AS classroom,c.title,c.closed,c.created_at AS createdAt,
 m.sequence AS lastSequence,COALESCE(r.sequence,0) AS readSequence,m.content,m.id AS messageId,m.author,m.posted_at AS postedAt
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
export type NewConversation = {
	id: string;
	classroom: string;
	family: string;
	title: string;
	message: string;
	content: string;
};
export async function startConversation(
	db: D1Database,
	who: Identity,
	value: NewConversation,
	now = Date.now()
) {
	await checkAudience(db, who, value.classroom, value.family);
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
	const results = await db.batch([
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
			)
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
	now = Date.now()
) {
	const thread = await conversationFor(db, who, id);
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
	const result = await db
		.prepare(
			`INSERT INTO messages(id,conversation_id,author,content,posted_at,charged)
 SELECT ?,?,?,?,?,${charge} WHERE EXISTS(SELECT 1 FROM conversations WHERE id=? AND closed=0) AND ${condition}
 ON CONFLICT(id) DO NOTHING`
		)
		.bind(message, id, actor(who), content, now, ...month, id, ...values)
		.run();
	if (!result.meta.changes) {
		if (await db.prepare('SELECT id FROM messages WHERE id=?').bind(message).first())
			return reply(db, who, id, message, content, now);
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
			'SELECT id,sequence,author,content,posted_at AS postedAt FROM messages WHERE conversation_id=? AND sequence<? ORDER BY sequence DESC LIMIT 50'
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
export async function closeConversation(db: D1Database, who: Identity, id: string) {
	if (who.kind !== 'staff') error(403, 'forbidden');
	await conversationFor(db, who, id);
	const [sql, params] = visibleClassrooms(who);
	await db
		.prepare(`UPDATE conversations SET closed=1 WHERE id=? AND classroom_id IN (${sql})`)
		.bind(id, ...params)
		.run();
}
