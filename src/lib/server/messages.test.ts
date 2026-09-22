import { localDatabase, localStore } from './test-database';
import { describe, expect, it } from 'vitest';
import type { Identity, Staff } from '$lib/api';
import { createId } from '$lib/crypto';
import { defaultSchedule, messageClock, sendingAllowed } from '$lib/messages';
import {
	closeConversation,
	deleteConversation,
	deleteMessage,
	editMessage,
	inbox,
	markRead,
	parseSettings,
	readMessages,
	messageFileBytes,
	reply,
	saveSettings,
	startConversation,
	uploadMessageFile
} from './messages';
import { conversationRecipients, deliver, createVapidSecret } from './push';
import type { PushEnv, PushMessage } from './push';
import type { Head, Manager } from './session';

const monday = Date.parse('2026-09-14T08:00:00Z'); // 10:00 Zagreb
async function fixture() {
	const db = localDatabase();
	const classroom = createId(),
		otherClassroom = createId(),
		family = createId(),
		otherFamily = createId(),
		teacher = createId(),
		lead = createId(),
		colleague = createId(),
		outsider = createId();
	for (const id of [classroom, otherClassroom])
		await db
			.prepare('INSERT INTO classrooms(id,profile,group_key_for_staff) VALUES (?,?,?)')
			.bind(id, 'profile', 'key')
			.run();
	for (const id of [family, otherFamily])
		await db.prepare('INSERT INTO families VALUES (?,?,?)').bind(id, 'profile', 'key').run();
	// The head holds no classroom; the lead and her colleague hold the one the family is in.
	for (const id of [teacher, lead, colleague, outsider])
		await db
			.prepare('INSERT INTO teachers (id,profile,role) VALUES (?,?,?)')
			.bind(id, 'profile', id === teacher ? 'head' : id === lead ? 'lead' : 'teacher')
			.run();
	for (const id of [lead, colleague])
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
	const head: Head = { kind: 'staff', teacher, role: 'head', credential: 'c', wrappedKey: 'k' };
	const groupLead: Manager = { ...head, teacher: lead, role: 'lead' };
	const staff: Staff = { ...head, teacher: colleague, role: 'teacher' };
	const stranger: Staff = { ...staff, teacher: outsider };
	const settings = {
		classroom,
		enabled: true,
		monthlyLimit: 1,
		schedule: defaultSchedule(),
		revision: 0
	};
	await saveSettings(db, head, settings);
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
		head,
		groupLead,
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
/** R2 in memory, as the events tests use, with room for a few small files. */
const objectStore = () => localStore({ bytes: 1e6, uploads: 100, downloads: 100 });

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
			reply(f.db, f.parent, first.id, createId(), 'anyone there?', [], monday)
		])
			await expect(blocked).rejects.toMatchObject({
				status: 409,
				body: { message: 'messages-limit' }
			});
		await reply(f.db, f.staff, first.id, createId(), 'teacher reply', [], monday);
		const answer = createId();
		expect(await reply(f.db, f.parent, first.id, answer, 'family answer', [], monday)).toBe(true);
		expect(await reply(f.db, f.parent, first.id, answer, 'family answer', [], monday)).toBe(false);
		expect((await inbox(f.db, f.parent, monday)).policies[0].used).toBe(1);
		// Writing again before the next answer charges again, once the allowance allows it.
		await expect(
			reply(f.db, f.parent, first.id, createId(), 'one more thing', [], monday)
		).rejects.toMatchObject({ body: { message: 'messages-limit' } });
		await saveSettings(f.db, f.head, { ...f.settings, monthlyLimit: 3, revision: 1 });
		expect(await reply(f.db, f.parent, first.id, createId(), 'one more thing', [], monday)).toBe(
			true
		);
		expect((await inbox(f.db, f.parent, monday)).policies[0].used).toBe(2);
		// Teachers are never charged, and a family answers an inquiry a teacher started for free.
		const theirs = f.inquiry();
		await startConversation(f.db, f.staff, theirs, monday);
		await reply(f.db, f.parent, theirs.id, createId(), 'thank you', [], monday);
		expect((await inbox(f.db, f.parent, monday)).policies[0].used).toBe(2);
		await closeConversation(f.db, f.staff, first.id);
		expect((await inbox(f.db, f.parent, monday)).policies[0].used).toBe(2);
		await expect(
			reply(f.db, f.parent, first.id, createId(), 'late', [], monday)
		).rejects.toMatchObject({ status: 409, body: { message: 'messages-closed' } });
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
				reply(f.db, who, first.id, createId(), 'intrusion', [], monday)
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
		await expect(
			deleteConversation(f.db, objectStore().store, f.staff, first.id)
		).rejects.toMatchObject({
			status: 409,
			body: { message: 'stale' }
		});
		await closeConversation(f.db, f.staff, first.id);
		await expect(
			deleteConversation(f.db, objectStore().store, f.parent, first.id)
		).rejects.toMatchObject({
			status: 403
		});
		await expect(
			deleteConversation(f.db, objectStore().store, f.stranger, first.id)
		).rejects.toMatchObject({
			status: 404
		});
		await deleteConversation(f.db, objectStore().store, f.staff, first.id);
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
			reply(f.db, f.parent, first.id, createId(), 'weekend', [], saturday)
		).rejects.toMatchObject({ body: { message: 'messages-hours' } });
		await reply(f.db, f.staff, first.id, createId(), 'staff weekend', [], saturday);
		await saveSettings(f.db, f.head, { ...f.settings, enabled: false, revision: 1 });
		await expect(
			reply(f.db, f.parent, first.id, createId(), 'disabled', [], monday)
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
		await saveSettings(f.db, f.head, { ...f.settings, classroom: f.otherClassroom });
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
		const { policies } = await inbox(f.db, f.head, monday);
		expect(policies.find((policy) => policy.classroom === f.otherClassroom)).toMatchObject({
			enabled: false,
			monthlyLimit: 3,
			used: 0
		});
	});
	// A teacher never reaches here: the route takes a head or a lead (src/routes/api/classrooms).
	it('lets the head settle any classroom and a lead only the ones she holds', async () => {
		const f = await fixture();
		const forOther = { ...f.settings, classroom: f.otherClassroom };
		await saveSettings(f.db, f.head, forOther);
		await saveSettings(f.db, f.groupLead, { ...f.settings, monthlyLimit: 5, revision: 1 });
		await expect(saveSettings(f.db, f.groupLead, forOther)).rejects.toMatchObject({ status: 409 });
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
			await reply(f.db, f.staff, first.id, createId(), `message ${index}`, [], monday);
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
		await expect(saveSettings(f.db, f.head, f.settings)).rejects.toMatchObject({ status: 409 });
		await f.db
			.prepare('DELETE FROM family_classrooms WHERE family_id=? AND classroom_id=?')
			.bind(f.family, f.classroom)
			.run();
		expect(await f.db.prepare('SELECT COUNT(*) AS n FROM messages').first()).toEqual({ n: 0 });
		await expect(readMessages(f.db, f.head, first.id)).rejects.toMatchObject({ status: 404 });
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
				.prepare('INSERT INTO sessions (token_hash, credential_id, expires_at) VALUES (?,?,?)')
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
describe('files on inquiries', () => {
	it('lets only staff attach, shows the family the bytes, and takes them away with the inquiry', async () => {
		const f = await fixture();
		const { objects, store } = objectStore();
		const first = f.inquiry();
		await startConversation(f.db, f.parent, first, monday);
		const file = createId();
		const message = createId();
		// A family attaches nothing, and neither does a teacher of another classroom.
		await expect(
			uploadMessageFile(f.db, store, f.parent, first.id, message, file, new Uint8Array([1]))
		).rejects.toMatchObject({ status: 403 });
		await expect(
			uploadMessageFile(f.db, store, f.stranger, first.id, message, file, new Uint8Array([1]))
		).rejects.toMatchObject({ status: 404 });
		await expect(
			reply(f.db, f.parent, first.id, createId(), 'sealed', [file], monday)
		).rejects.toMatchObject({ status: 403 });
		// A message naming a file nobody uploaded is refused, and nothing of it is written.
		await expect(
			reply(f.db, f.staff, first.id, message, 'sealed', [file], monday)
		).rejects.toMatchObject({ status: 409 });
		expect(await readMessages(f.db, f.staff, first.id)).toHaveLength(1);
		await uploadMessageFile(f.db, store, f.staff, first.id, message, file, new Uint8Array([7]));
		expect(await reply(f.db, f.staff, first.id, message, 'sealed', [file], monday)).toBe(true);
		// The family reads the bytes; a teacher of another classroom doesn't, and neither does another family.
		const response = await messageFileBytes(f.db, store, f.parent, first.id, message, file);
		expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([7]));
		for (const who of [f.stranger, { ...f.parent, family: f.otherFamily }])
			await expect(
				messageFileBytes(f.db, store, who, first.id, message, file)
			).rejects.toMatchObject({ status: 404 });
		// An identical retry sends nothing twice and leaves the file named once.
		expect(await reply(f.db, f.staff, first.id, message, 'sealed', [file], monday)).toBe(false);
		expect((await f.db.prepare('SELECT * FROM message_files').all()).results).toHaveLength(1);
		await closeConversation(f.db, f.staff, first.id);
		await deleteConversation(f.db, store, f.staff, first.id);
		expect(objects.size).toBe(0);
	});
});
describe('changing one message', () => {
	it('lets a teacher change their own words, and nobody else’s, while the inquiry is open', async () => {
		const f = await fixture(),
			first = f.inquiry();
		const message = createId();
		await startConversation(f.db, f.staff, first, monday);
		await reply(f.db, f.staff, first.id, message, 'sealed first try', [], monday);
		await editMessage(f.db, f.staff, first.id, message, 'sealed again', monday + 1000);
		const changed = (await readMessages(f.db, f.staff, first.id)).at(-1)!;
		expect(changed).toMatchObject({ content: 'sealed again', editedAt: monday + 1000 });
		// A colleague shares the conversation but not the message; the family it was written to has no say.
		for (const who of [f.head, f.parent])
			await expect(
				editMessage(f.db, who, first.id, message, 'not theirs', monday)
			).rejects.toMatchObject({ status: 403, body: { message: 'forbidden' } });
		// A closed inquiry is read-only, as it is for new messages.
		await closeConversation(f.db, f.staff, first.id);
		await expect(
			editMessage(f.db, f.staff, first.id, message, 'too late', monday)
		).rejects.toMatchObject({ status: 409, body: { message: 'messages-closed' } });
	});
	it('lets a family change its message until a teacher opens the conversation that far', async () => {
		const f = await fixture(),
			first = f.inquiry();
		expect(await startConversation(f.db, f.parent, first, monday)).toBe(true);
		await editMessage(f.db, f.parent, first.id, first.message, 'sealed rewrite', monday + 1000);
		const opening = await readMessages(f.db, f.parent, first.id);
		expect(opening[0]).toMatchObject({ content: 'sealed rewrite', editedAt: monday + 1000 });
		// Changing it spent nothing: the message it changed already spent what it cost.
		expect((await inbox(f.db, f.parent, monday)).policies[0].used).toBe(1);
		// A teacher answers and reads only the answer's own sequence, leaving the family's message unopened
		// on a colleague's device; read progress below it still leaves it the family's to change.
		const answer = createId();
		await reply(f.db, f.staff, first.id, answer, 'sealed answer', [], monday);
		const second = createId();
		await reply(f.db, f.parent, first.id, second, 'sealed second', [], monday);
		await markRead(f.db, f.staff, first.id, opening[0].sequence);
		const later = await readMessages(f.db, f.parent, first.id);
		await editMessage(f.db, f.parent, first.id, second, 'sealed second again', monday + 2000);
		expect(later.at(-1)!.id).toBe(second);
		// Opening the conversation as far as that message ends it: what a teacher has read has been read.
		await markRead(f.db, f.staff, first.id, later.at(-1)!.sequence);
		await expect(
			editMessage(f.db, f.parent, first.id, second, 'sealed once more', monday)
		).rejects.toMatchObject({ status: 409, body: { message: 'message-seen' } });
		// The one the teacher read at the start is past that mark too.
		await expect(
			editMessage(f.db, f.parent, first.id, first.message, 'sealed once more', monday)
		).rejects.toMatchObject({ status: 409, body: { message: 'message-seen' } });
		// Each side's inbox says how far the other has read, which is what tells a family this.
		const family = (await inbox(f.db, f.parent, monday)).conversations[0];
		expect(family.seenSequence).toBe(later.at(-1)!.sequence);
		const teacher = (await inbox(f.db, f.staff, monday)).conversations[0];
		expect(teacher.seenSequence).toBe(0);
		await markRead(f.db, f.parent, first.id, later.at(-1)!.sequence);
		expect((await inbox(f.db, f.staff, monday)).conversations[0].seenSequence).toBe(
			later.at(-1)!.sequence
		);
	});
	it('deletes a teacher’s own message as a placeholder, with its files, and never a family’s', async () => {
		const f = await fixture();
		const { objects, store } = objectStore();
		const first = f.inquiry();
		await startConversation(f.db, f.parent, first, monday);
		const message = createId(),
			file = createId();
		await uploadMessageFile(f.db, store, f.staff, first.id, message, file, new Uint8Array([7]));
		await reply(f.db, f.staff, first.id, message, 'sealed with a file', [file], monday);
		expect(objects.size).toBe(1);
		// A family deletes nothing of its own, and a teacher deletes nothing of a colleague's.
		await expect(
			deleteMessage(f.db, store, f.parent, first.id, first.message, monday)
		).rejects.toMatchObject({ status: 403 });
		await expect(
			deleteMessage(f.db, store, f.head, first.id, message, monday)
		).rejects.toMatchObject({ status: 403 });
		await deleteMessage(f.db, store, f.staff, first.id, message, monday + 1000);
		const rows = await readMessages(f.db, f.parent, first.id);
		// The row stayed where it was, so the conversation's order and both sides' read progress are intact.
		expect(rows).toHaveLength(2);
		expect(rows[1]).toMatchObject({ id: message, content: '', deletedAt: monday + 1000 });
		expect((await f.db.prepare('SELECT * FROM message_files').all()).results).toHaveLength(0);
		expect(objects.size).toBe(0);
		await expect(
			messageFileBytes(f.db, store, f.parent, first.id, message, file)
		).rejects.toMatchObject({ status: 404 });
		// There is nothing left of it to change or delete again.
		for (const refused of [
			editMessage(f.db, f.staff, first.id, message, 'sealed anew', monday),
			deleteMessage(f.db, store, f.staff, first.id, message, monday)
		])
			await expect(refused).rejects.toMatchObject({ status: 409, body: { message: 'stale' } });
		// The inbox shows the placeholder in the preview while the deleted message is the latest.
		const latest = (await inbox(f.db, f.parent, monday)).conversations[0];
		expect(latest).toMatchObject({ messageId: message, content: '', deletedAt: monday + 1000 });
	});
	it('keeps a message as it was once the other side answered it', async () => {
		const f = await fixture();
		const { store } = objectStore();
		const first = f.inquiry();
		await startConversation(f.db, f.parent, first, monday);
		// Two teacher messages in a row: the family has answered neither, so both are still the teacher's.
		const question = createId(),
			afterthought = createId();
		await reply(f.db, f.staff, first.id, question, 'sealed question', [], monday);
		await reply(f.db, f.staff, first.id, afterthought, 'sealed more', [], monday);
		await editMessage(f.db, f.staff, first.id, question, 'sealed question again', monday + 1000);
		// The family answers, and the words it answered stay: neither changed nor deleted.
		const answer = createId();
		await reply(f.db, f.parent, first.id, answer, 'sealed answer', [], monday);
		for (const refused of [
			editMessage(f.db, f.staff, first.id, question, 'sealed once more', monday),
			editMessage(f.db, f.staff, first.id, afterthought, 'sealed once more', monday),
			deleteMessage(f.db, store, f.staff, first.id, afterthought, monday)
		])
			await expect(refused).rejects.toMatchObject({
				status: 409,
				body: { message: 'message-answered' }
			});
		// The family's answer is its own until a teacher writes back, or opens it.
		await editMessage(f.db, f.parent, first.id, answer, 'sealed answer again', monday + 2000);
		await reply(f.db, f.staff, first.id, createId(), 'sealed reply', [], monday);
		await expect(
			editMessage(f.db, f.parent, first.id, answer, 'sealed too late', monday)
		).rejects.toMatchObject({ status: 409, body: { message: 'message-answered' } });
	});
	it('refuses a message that isn’t in the conversation the device asked about', async () => {
		const f = await fixture(),
			first = f.inquiry(),
			other = f.inquiry();
		await startConversation(f.db, f.staff, first, monday);
		await saveSettings(f.db, f.head, { ...f.settings, monthlyLimit: 3, revision: 1 });
		await startConversation(f.db, f.parent, other, monday);
		await expect(
			editMessage(f.db, f.staff, other.id, first.message, 'sealed', monday)
		).rejects.toMatchObject({ status: 404, body: { message: 'not-found' } });
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
