import { readdirSync, readFileSync } from 'node:fs';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import type { Identity, Staff } from '$lib/api';
import { createId } from '$lib/crypto';
import { defaultSchedule, messageClock, sendingAllowed } from '$lib/messages';
import {
	closeConversation,
	deleteConversation,
	inbox,
	markRead,
	parseSettings,
	readMessages,
	reply,
	saveSettings,
	startConversation
} from './messages';
import { conversationRecipients, deliver, createVapidSecret } from './push';
import type { PushEnv, PushMessage } from './push';
import type { Admin } from './session';
type Statement = { sql: string; params: SQLInputValue[] };

/** The part of D1's API the server uses, over an in-memory SQLite database with the migrations applied. */
function localDatabase() {
	const sqlite = new DatabaseSync(':memory:');
	sqlite.exec('PRAGMA foreign_keys = ON');
	// Every migration, in order, as D1 applies them.
	for (const file of readdirSync('migrations')
		.filter((name) => name.endsWith('.sql'))
		.sort()) {
		sqlite.exec(readFileSync(`migrations/${file}`, 'utf8'));
	}
	const execute = ({ sql, params }: Statement) => {
		const prepared = sqlite.prepare(sql);
		if (prepared.columns().length) {
			return { results: prepared.all(...params), meta: { changes: 0 } };
		}
		return { results: [], meta: { changes: Number(prepared.run(...params).changes) } };
	};
	const statement = (sql: string, params: SQLInputValue[] = []) => ({
		sql,
		params,
		bind: (...values: SQLInputValue[]) => statement(sql, values),
		first: async () => sqlite.prepare(sql).get(...params) ?? null,
		all: async () => execute({ sql, params }),
		run: async () => execute({ sql, params })
	});
	const batch = async (statements: Statement[]) => {
		sqlite.exec('BEGIN');
		try {
			const results = statements.map(execute);
			sqlite.exec('COMMIT');
			return results;
		} catch (cause) {
			sqlite.exec('ROLLBACK');
			throw cause;
		}
	};
	return { prepare: (sql: string) => statement(sql), batch } as unknown as D1Database;
}

const monday = Date.parse('2026-09-14T08:00:00Z'); // 10:00 Zagreb
async function fixture() {
	const db = localDatabase();
	const classroom = createId(),
		otherClassroom = createId(),
		family = createId(),
		otherFamily = createId(),
		teacher = createId(),
		colleague = createId(),
		outsider = createId();
	for (const id of [classroom, otherClassroom])
		await db
			.prepare('INSERT INTO classrooms(id,profile,group_key_for_staff) VALUES (?,?,?)')
			.bind(id, 'profile', 'key')
			.run();
	for (const id of [family, otherFamily])
		await db.prepare('INSERT INTO families VALUES (?,?,?)').bind(id, 'profile', 'key').run();
	for (const id of [teacher, colleague, outsider])
		await db
			.prepare('INSERT INTO teachers VALUES (?,?,?)')
			.bind(id, id === teacher ? 1 : 0, 'profile')
			.run();
	for (const id of [teacher, colleague])
		await db.prepare('INSERT INTO teacher_classrooms VALUES (?,?)').bind(id, classroom).run();
	await db
		.prepare('INSERT INTO teacher_classrooms VALUES (?,?)')
		.bind(outsider, otherClassroom)
		.run();
	for (const id of [family, otherFamily])
		await db
			.prepare('INSERT INTO family_classrooms VALUES (?,?,?)')
			.bind(id, classroom, 'key')
			.run();
	const parent: Identity = { kind: 'family', family, credential: 'c', wrappedKey: 'k' };
	const admin: Admin = { kind: 'staff', teacher, admin: true, credential: 'c', wrappedKey: 'k' };
	const staff: Staff = { ...admin, teacher: colleague, admin: false };
	const stranger: Staff = { ...staff, teacher: outsider };
	const settings = {
		classroom,
		enabled: true,
		monthlyLimit: 1,
		schedule: defaultSchedule(),
		revision: 0
	};
	await saveSettings(db, admin, settings);
	const inquiry = () => ({
		id: createId(),
		classroom,
		family,
		title: 'sealed title',
		message: createId(),
		content: 'sealed body'
	});
	return {
		db,
		parent,
		admin,
		staff,
		stranger,
		settings,
		inquiry,
		classroom,
		otherClassroom,
		family,
		otherFamily
	};
}
describe('private inquiries', () => {
	it('charges every family message a teacher hasn’t answered yet, and nothing else', async () => {
		const f = await fixture(),
			first = f.inquiry();
		expect(await startConversation(f.db, f.parent, first, monday)).toBe(true);
		expect(await startConversation(f.db, f.parent, first, monday)).toBe(false);
		// The month's one allowance went on the inquiry, so neither another inquiry nor another message
		// before an answer goes through.
		for (const blocked of [
			startConversation(f.db, f.parent, f.inquiry(), monday),
			reply(f.db, f.parent, first.id, createId(), 'anyone there?', monday)
		])
			await expect(blocked).rejects.toMatchObject({
				status: 409,
				body: { message: 'messages-limit' }
			});
		await reply(f.db, f.staff, first.id, createId(), 'teacher reply', monday);
		const answer = createId();
		expect(await reply(f.db, f.parent, first.id, answer, 'family answer', monday)).toBe(true);
		expect(await reply(f.db, f.parent, first.id, answer, 'family answer', monday)).toBe(false);
		expect((await inbox(f.db, f.parent, monday)).policies[0].used).toBe(1);
		// Writing again before the next answer charges again, once the allowance allows it.
		await expect(
			reply(f.db, f.parent, first.id, createId(), 'one more thing', monday)
		).rejects.toMatchObject({ body: { message: 'messages-limit' } });
		await saveSettings(f.db, f.admin, { ...f.settings, monthlyLimit: 3, revision: 1 });
		expect(await reply(f.db, f.parent, first.id, createId(), 'one more thing', monday)).toBe(true);
		expect((await inbox(f.db, f.parent, monday)).policies[0].used).toBe(2);
		// Teachers are never charged, and a family answers an inquiry a teacher started for free.
		const theirs = f.inquiry();
		await startConversation(f.db, f.staff, theirs, monday);
		await reply(f.db, f.parent, theirs.id, createId(), 'thank you', monday);
		expect((await inbox(f.db, f.parent, monday)).policies[0].used).toBe(2);
		await closeConversation(f.db, f.staff, first.id);
		expect((await inbox(f.db, f.parent, monday)).policies[0].used).toBe(2);
		await expect(reply(f.db, f.parent, first.id, createId(), 'late', monday)).rejects.toMatchObject(
			{ status: 409, body: { message: 'messages-closed' } }
		);
		await expect(closeConversation(f.db, f.parent, first.id)).rejects.toMatchObject({
			status: 403
		});
	});
	it('refuses other families and unassigned teachers; colleagues share the whole conversation', async () => {
		const f = await fixture(),
			first = f.inquiry();
		await startConversation(f.db, f.parent, first, monday);
		const other: Identity = { ...f.parent, kind: 'family' as const, family: f.otherFamily };
		expect((await inbox(f.db, other, monday)).conversations).toHaveLength(0);
		expect((await inbox(f.db, f.stranger, monday)).conversations).toHaveLength(0);
		for (const who of [other, f.stranger]) {
			await expect(readMessages(f.db, who, first.id)).rejects.toMatchObject({ status: 404 });
			await expect(
				reply(f.db, who, first.id, createId(), 'intrusion', monday)
			).rejects.toMatchObject({ status: 404 });
			await expect(
				startConversation(f.db, who, { ...f.inquiry(), family: f.family }, monday)
			).rejects.toMatchObject({ status: 404 });
		}
		expect(await readMessages(f.db, f.staff, first.id)).toHaveLength(1);
	});
	it('deletes a closed inquiry for both sides, and only a closed one, and only for staff', async () => {
		const f = await fixture(),
			first = f.inquiry();
		await startConversation(f.db, f.parent, first, monday);
		await markRead(f.db, f.staff, first.id, 1);
		expect((await inbox(f.db, f.parent, monday)).policies[0].used).toBe(1);
		// Closing it is the deliberate first step: an open one can't be taken from a family mid-conversation.
		await expect(deleteConversation(f.db, f.staff, first.id)).rejects.toMatchObject({
			status: 409,
			body: { message: 'stale' }
		});
		await closeConversation(f.db, f.staff, first.id);
		await expect(deleteConversation(f.db, f.parent, first.id)).rejects.toMatchObject({
			status: 403
		});
		await expect(deleteConversation(f.db, f.stranger, first.id)).rejects.toMatchObject({
			status: 404
		});
		await deleteConversation(f.db, f.staff, first.id);
		// Gone on both sides, with the messages and read marks the schema carries out with it.
		expect((await inbox(f.db, f.parent, monday)).conversations).toHaveLength(0);
		expect((await inbox(f.db, f.staff, monday)).conversations).toHaveLength(0);
		for (const table of ['messages', 'conversation_reads'])
			expect(
				await f.db.prepare(`SELECT 1 FROM ${table} WHERE conversation_id=?`).bind(first.id).first()
			).toBe(null);
		// What the family spent on it is spent no longer, so the month's allowance is its own again.
		expect((await inbox(f.db, f.parent, monday)).policies[0].used).toBe(0);
		expect(await startConversation(f.db, f.parent, f.inquiry(), monday)).toBe(true);
	});
	it('applies off switch and hours to replies too, but never restricts teachers', async () => {
		const f = await fixture(),
			first = f.inquiry();
		await startConversation(f.db, f.staff, first, monday);
		const saturday = Date.parse('2026-09-19T08:00Z');
		await expect(
			reply(f.db, f.parent, first.id, createId(), 'weekend', saturday)
		).rejects.toMatchObject({ body: { message: 'messages-hours' } });
		await reply(f.db, f.staff, first.id, createId(), 'staff weekend', saturday);
		await saveSettings(f.db, f.admin, { ...f.settings, enabled: false, revision: 1 });
		await expect(
			reply(f.db, f.parent, first.id, createId(), 'disabled', monday)
		).rejects.toMatchObject({ body: { message: 'messages-disabled' } });
		await expect(startConversation(f.db, f.parent, f.inquiry(), monday)).rejects.toMatchObject({
			body: { message: 'messages-disabled' }
		});
		await startConversation(f.db, f.staff, f.inquiry(), saturday);
	});
	it('uses each classroom’s quota and calendar month, including Zagreb month boundary', async () => {
		const f = await fixture();
		await startConversation(f.db, f.parent, f.inquiry(), monday);
		await f.db
			.prepare('INSERT INTO family_classrooms VALUES (?,?,?)')
			.bind(f.family, f.otherClassroom, 'key')
			.run();
		await saveSettings(f.db, f.admin, { ...f.settings, classroom: f.otherClassroom });
		await startConversation(
			f.db,
			f.parent,
			{ ...f.inquiry(), classroom: f.otherClassroom },
			monday
		);
		await startConversation(f.db, f.parent, f.inquiry(), Date.parse('2026-10-01T08:00Z'));
		expect(messageClock(Date.parse('2026-09-30T22:05Z')).month).toBe('2026-10');
		// One inquiry spent in each classroom in September, and October starts both over.
		const september = await inbox(f.db, f.parent, monday);
		const spent = (policies: typeof september.policies, classroom: string) =>
			policies.find((policy) => policy.classroom === classroom)?.used;
		expect(spent(september.policies, f.classroom)).toBe(1);
		expect(spent(september.policies, f.otherClassroom)).toBe(1);
		const october = await inbox(f.db, f.parent, Date.parse('2026-10-05T08:00Z'));
		expect(spent(october.policies, f.classroom)).toBe(1);
		expect(spent(october.policies, f.otherClassroom)).toBe(0);
	});
	it('starts a classroom nobody has settled switched off, with three inquiries a month', async () => {
		const f = await fixture();
		const { policies } = await inbox(f.db, f.admin, monday);
		expect(policies.find((policy) => policy.classroom === f.otherClassroom)).toMatchObject({
			enabled: false,
			monthlyLimit: 3,
			used: 0
		});
	});
	it('handles concurrent last-slot sends and identical retries without partial or duplicate messages', async () => {
		const f = await fixture();
		const results = await Promise.allSettled([
			startConversation(f.db, f.parent, f.inquiry(), monday),
			startConversation(f.db, f.parent, f.inquiry(), monday)
		]);
		expect(results.filter((item) => item.status === 'fulfilled')).toHaveLength(1);
		expect((await inbox(f.db, f.parent, monday)).conversations).toHaveLength(1);
		const other = await fixture(),
			inquiry = other.inquiry();
		await Promise.all([
			startConversation(other.db, other.parent, inquiry, monday),
			startConversation(other.db, other.parent, inquiry, monday)
		]);
		expect(await readMessages(other.db, other.parent, inquiry.id)).toHaveLength(1);
	});
	it('keeps read progress per teacher and family, and paginates without losing messages', async () => {
		const f = await fixture(),
			first = f.inquiry();
		await startConversation(f.db, f.staff, first, monday);
		for (let index = 0; index < 52; index++)
			await reply(f.db, f.staff, first.id, createId(), `message ${index}`, monday);
		const recent = await readMessages(f.db, f.parent, first.id);
		expect(recent).toHaveLength(50);
		expect(await readMessages(f.db, f.parent, first.id, recent[0].sequence)).toHaveLength(3);
		await markRead(f.db, f.parent, first.id, recent.at(-1)!.sequence);
		await markRead(f.db, f.parent, first.id, recent[0].sequence);
		const read = (await inbox(f.db, f.parent, monday)).conversations[0];
		expect(read.readSequence).toBe(read.lastSequence);
		expect((await inbox(f.db, f.staff, monday)).conversations[0].readSequence).toBe(0);
	});
	it('removes conversations on membership removal and rejects stale settings', async () => {
		const f = await fixture(),
			first = f.inquiry();
		await startConversation(f.db, f.parent, first, monday);
		await expect(saveSettings(f.db, f.admin, f.settings)).rejects.toMatchObject({ status: 409 });
		await f.db
			.prepare('DELETE FROM family_classrooms WHERE family_id=? AND classroom_id=?')
			.bind(f.family, f.classroom)
			.run();
		expect(await f.db.prepare('SELECT COUNT(*) AS n FROM messages').first()).toEqual({ n: 0 });
		await expect(readMessages(f.db, f.admin, first.id)).rejects.toMatchObject({ status: 404 });
	});
	it('routes notifications only to this family and its assigned teachers', async () => {
		const f = await fixture(),
			first = f.inquiry();
		await startConversation(f.db, f.parent, first, monday);
		for (const [index, who] of [
			f.parent,
			{ ...f.parent, kind: 'family' as const, family: f.otherFamily },
			f.staff,
			f.stranger
		].entries()) {
			const credential = createId();
			await f.db
				.prepare(
					'INSERT INTO credentials(id,teacher_id,family_id,auth_token_hash,wrapped_key) VALUES (?,?,?,?,?)'
				)
				.bind(
					credential,
					who.kind === 'staff' ? who.teacher : null,
					who.kind === 'family' ? who.family : null,
					createId(),
					'key'
				)
				.run();
			await f.db
				.prepare('INSERT INTO sessions VALUES (?,?,?)')
				.bind(`session${index}`, credential, monday + 100000)
				.run();
			await f.db
				.prepare('INSERT INTO push_subscriptions (endpoint, session_hash) VALUES (?,?)')
				.bind(`https://web.push.apple.com/${index}`, `session${index}`)
				.run();
		}
		const reached = async (poster: string) =>
			(await conversationRecipients(f.db, first.id, poster, monday)).map(
				({ endpoint }) => endpoint
			);
		expect(await reached('')).toEqual([
			'https://web.push.apple.com/0',
			'https://web.push.apple.com/2'
		]);
		expect(await reached('session0')).toEqual(['https://web.push.apple.com/2']);
		await f.db
			.prepare('UPDATE sessions SET expires_at=?')
			.bind(Date.now() + 100000)
			.run();
		await f.db
			.prepare('DELETE FROM teacher_classrooms WHERE teacher_id=?')
			.bind(f.staff.teacher)
			.run();
		const sent: string[] = [];
		await deliver(
			{
				messages: [
					{
						body: {
							devices: ['https://web.push.apple.com/0', 'https://web.push.apple.com/2'].map(
								(endpoint) => ({ endpoint, p256dh: null, auth: null })
							),
							subject: 'http://localhost',
							kind: 'message',
							attempt: 0,
							conversation: first.id
						},
						ack: () => {}
					}
				]
			} as unknown as MessageBatch<PushMessage>,
			{
				DB: f.db,
				VAPID_KEY: await createVapidSecret(),
				NOTIFICATIONS: { send: async () => {} }
			} as unknown as PushEnv,
			(async (url: string) => {
				sent.push(url);
				return new Response(null, { status: 201 });
			}) as typeof fetch
		);
		expect(sent).toEqual(['https://web.push.apple.com/0']);
	});
});
describe('sending schedule', () => {
	it('validates the five days and same-day intervals', () => {
		const body = { enabled: true, monthlyLimit: 10, revision: 0, schedule: defaultSchedule() };
		expect(parseSettings('class', body).schedule).toHaveLength(5);
		for (const changed of [
			{ schedule: [] },
			{ monthlyLimit: 0 },
			{ monthlyLimit: -1 },
			{ monthlyLimit: 1.5 },
			{ schedule: [{ start: '16:00', end: '08:00' }, null, null, null, null] },
			{ schedule: [{ start: '25:00', end: '26:00' }, null, null, null, null] }
		])
			expect(() => parseSettings('class', { ...body, ...changed })).toThrow();
	});
	it('includes opening time, excludes closing time, and follows daylight saving', () => {
		const settings = {
			classroom: 'c',
			enabled: true,
			monthlyLimit: 1,
			revision: 0,
			schedule: defaultSchedule()
		};
		expect(sendingAllowed(settings, Date.parse('2026-09-14T06:00Z'))).toBe(true);
		expect(sendingAllowed(settings, Date.parse('2026-09-14T14:00Z'))).toBe(false);
		expect(sendingAllowed(settings, Date.parse('2026-12-14T07:00Z'))).toBe(true);
		expect(sendingAllowed(settings, Date.parse('2026-12-14T06:59Z'))).toBe(false);
	});
});
