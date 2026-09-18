import { announceMeetingChanges, type PushMessage } from './push';
import { meetingTimestamp } from '$lib/meetings';
import { messageClock } from '$lib/messages';
import { readdirSync, readFileSync } from 'node:fs';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import type { Identity, Staff } from '$lib/api';
import { createId, createContentKey, encryptData } from '$lib/crypto';
import {
	meetingData,
	publishMeetings,
	changeMeeting,
	parseOffer,
	removeMeetingDay
} from './meetings';
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

async function fixture() {
	const db = localDatabase();
	const classroom = createId(),
		otherClassroom = createId(),
		teacher = createId(),
		family = createId(),
		secondFamily = createId(),
		otherFamily = createId(),
		child = createId(),
		otherChild = createId();
	await db.prepare('INSERT INTO installation VALUES(1,0,0)').run();
	for (const id of [classroom, otherClassroom])
		await db
			.prepare('INSERT INTO classrooms(id,profile,group_key_for_staff) VALUES(?,?,?)')
			.bind(id, 'profile', 'key')
			.run();
	await db.prepare('INSERT INTO teachers VALUES(?,?,?)').bind(teacher, 1, 'profile').run();
	await db.prepare('INSERT INTO teacher_classrooms VALUES(?,?)').bind(teacher, classroom).run();
	for (const id of [family, secondFamily, otherFamily]) {
		await db.prepare('INSERT INTO families VALUES(?,?,?)').bind(id, 'profile', 'key').run();
		await db
			.prepare('INSERT INTO family_classrooms VALUES(?,?,?)')
			.bind(id, classroom, 'key')
			.run();
	}
	for (const id of [child, otherChild])
		await db.prepare('INSERT INTO children VALUES(?,?,?)').bind(id, classroom, 'profile').run();
	const staff: Staff = { kind: 'staff', teacher, admin: false, credential: 'c', wrappedKey: 'k' };
	const parent: Identity = { kind: 'family', family, credential: 'c', wrappedKey: 'k' };
	const second: Identity = { ...parent, family: secondFamily };
	const other: Identity = { ...parent, family: otherFamily };
	const start = meetingTimestamp(messageClock(Date.now() + 86400000).date, '10:00');
	const label = await encryptData({ name: 'Private' }, (await createContentKey()).key, {
		purpose: 'meeting-invite',
		classroom: 'offer',
		child
	});
	const offer = {
		id: createId(),
		classroom,
		revision: 0,
		slots: [
			{ id: createId(), start, end: start + 1200000 },
			{ id: createId(), start: start + 1200000, end: start + 2400000 }
		],
		invites: [
			{ child, family, label },
			{ child, family: secondFamily, label },
			{ child: otherChild, family: otherFamily, label }
		]
	};
	await publishMeetings(db, staff, offer);
	return { db, staff, parent, second, other, offer, child, otherChild, otherClassroom };
}
describe('meeting reservations', () => {
	it('lets only one simultaneous claimant reserve a time and hides other children', async () => {
		const { db, parent, other, staff, offer, child, otherChild } = await fixture();
		const result = await Promise.allSettled([
			changeMeeting(db, parent, offer.slots[0].id, { action: 'book', version: 0, child }),
			changeMeeting(db, other, offer.slots[0].id, { action: 'book', version: 0, child: otherChild })
		]);
		expect(result.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
		const booked = (await meetingData(db, staff)).slots[0];
		const loser = booked.child === child ? other : parent;
		expect((await meetingData(db, loser)).slots[0]).toMatchObject({
			booked: true,
			mine: false,
			child: null
		});
	});
	it('shares a child reservation across family cards and prevents a second booking', async () => {
		const { db, parent, second, offer, child } = await fixture();
		await changeMeeting(db, parent, offer.slots[0].id, { action: 'book', version: 0, child });
		expect((await meetingData(db, second)).slots[0]).toMatchObject({ mine: true, child });
		await expect(
			changeMeeting(db, second, offer.slots[1].id, { action: 'book', version: 0, child })
		).rejects.toMatchObject({ status: 409 });
		await changeMeeting(db, second, offer.slots[0].id, { action: 'cancel', version: 1 });
		expect((await meetingData(db, parent)).slots[0]).toMatchObject({ booked: false, version: 2 });
	});
	it('does not accept another child, remove a booked slot, or cancel someone else’s booking', async () => {
		const { db, parent, other, staff, offer, child, otherChild } = await fixture();
		await expect(
			changeMeeting(db, parent, offer.slots[0].id, {
				action: 'book',
				version: 0,
				child: otherChild
			})
		).rejects.toMatchObject({ status: 409 });
		await changeMeeting(db, parent, offer.slots[0].id, { action: 'book', version: 0, child });
		await expect(
			changeMeeting(db, other, offer.slots[0].id, { action: 'cancel', version: 1 })
		).rejects.toMatchObject({ status: 409 });
		await expect(
			changeMeeting(db, staff, offer.slots[0].id, { action: 'remove', version: 1 })
		).rejects.toMatchObject({ status: 409 });
	});
	it('rejects stale cancellation after another family takes the released time', async () => {
		const { db, parent, other, staff, offer, child, otherChild } = await fixture();
		const id = offer.slots[0].id;
		await changeMeeting(db, parent, id, { action: 'book', version: 0, child });
		await changeMeeting(db, parent, id, { action: 'cancel', version: 1 });
		await changeMeeting(db, other, id, { action: 'book', version: 2, child: otherChild });
		await expect(
			changeMeeting(db, staff, id, { action: 'cancel', version: 1 })
		).rejects.toMatchObject({ status: 409 });
		expect((await meetingData(db, other)).slots[0].mine).toBe(true);
	});
	it('checks classroom permissions, author rights, and start times', async () => {
		const { db, staff, parent, offer, child, otherClassroom } = await fixture();
		const outsider = { ...staff, teacher: createId() };
		expect((await meetingData(db, outsider)).slots).toEqual([]);
		await expect(
			changeMeeting(db, outsider, offer.slots[0].id, { action: 'remove', version: 0 })
		).rejects.toMatchObject({ status: 404 });
		await expect(
			publishMeetings(db, staff, { ...offer, id: createId(), classroom: otherClassroom })
		).rejects.toMatchObject({ status: 409 });
		await expect(
			changeMeeting(
				db,
				parent,
				offer.slots[0].id,
				{ action: 'book', version: 0, child },
				offer.slots[0].start
			)
		).rejects.toMatchObject({ status: 409 });
	});
	it('publishes atomically and refuses overlapping or stale offers', async () => {
		const { db, staff, offer } = await fixture();
		const overlapping = {
			...offer,
			id: createId(),
			slots: offer.slots.map((s) => ({ ...s, id: createId() }))
		};
		await expect(publishMeetings(db, staff, overlapping)).rejects.toMatchObject({
			status: 409,
			body: { message: 'meeting-overlap' }
		});
		expect(
			(await db.prepare('SELECT COUNT(*) AS n FROM meeting_offers').first<{ n: number }>())?.n
		).toBe(1);
		await expect(publishMeetings(db, staff, { ...overlapping, revision: 4 })).rejects.toMatchObject(
			{ status: 409 }
		);
		expect((await meetingData(db, staff)).slots).toHaveLength(2);
	});
	it('releases reservations when a child moves, and revokes a removed family', async () => {
		const { db, parent, second, offer, child, otherClassroom } = await fixture();
		await changeMeeting(db, parent, offer.slots[0].id, { action: 'book', version: 0, child });
		await db.prepare('DELETE FROM family_classrooms WHERE family_id=?').bind(parent.family).run();
		expect((await meetingData(db, parent)).slots).toEqual([]);
		expect((await meetingData(db, second)).slots[0].mine).toBe(true);
		await db
			.prepare('UPDATE children SET classroom_id=? WHERE id=?')
			.bind(otherClassroom, child)
			.run();
		expect((await meetingData(db, second)).slots[0]).toMatchObject({ booked: false });
		expect((await meetingData(db, second)).invites).toEqual([]);
	});
	it('validates bounded, future offers and encrypted labels', async () => {
		const { offer } = await fixture();
		expect(parseOffer(offer).slots).toHaveLength(2);
		for (const change of [
			{ slots: [] },
			{ slots: [{ ...offer.slots[0], start: 0 }] },
			{ invites: [{ ...offer.invites[0], label: 'plaintext' }] },
			{ slots: [null] }
		])
			expect(() => parseOffer({ ...offer, ...change })).toThrow();
	});
});

it('revokes one child invitation without removing the family’s access through a sibling', async () => {
	const { db, parent, second, offer, child } = await fixture();
	await changeMeeting(db, parent, offer.slots[0].id, { action: 'book', version: 0, child });
	await db
		.prepare('DELETE FROM meeting_invites WHERE child_id=? AND family_id=?')
		.bind(child, parent.family)
		.run();
	expect((await meetingData(db, parent)).slots[0]).toMatchObject({
		booked: true,
		mine: false,
		child: null
	});
	await expect(
		changeMeeting(db, parent, offer.slots[0].id, { action: 'cancel', version: 1 })
	).rejects.toMatchObject({ status: 409 });
	await db
		.prepare('DELETE FROM meeting_invites WHERE child_id=? AND family_id=?')
		.bind(child, second.family)
		.run();
	expect((await meetingData(db, parent)).slots[0]).toMatchObject({ booked: false });
});

describe('removing a day of meetings', () => {
	const request = (classroom: string, slots: { id: string; version: number; start: number }[]) => ({
		classroom,
		date: messageClock(slots[0].start).date,
		slots: slots.map(({ id, version }) => ({ id, version }))
	});
	it('removes free and booked times together, returning bookings for notifications', async () => {
		const { db, staff, parent, offer, child } = await fixture();
		await changeMeeting(db, parent, offer.slots[0].id, { action: 'book', version: 0, child });
		const data = await meetingData(db, staff);
		const removed = await removeMeetingDay(db, staff, request(offer.classroom, data.slots));
		expect(removed).toHaveLength(2);
		expect(removed).toContainEqual({ offer: offer.id, child });
		expect((await meetingData(db, parent)).slots).toEqual([]);
	});
	it('refuses the whole deletion if a parent books after the confirmation opened', async () => {
		const { db, staff, parent, offer, child } = await fixture();
		const body = request(offer.classroom, (await meetingData(db, staff)).slots);
		await changeMeeting(db, parent, offer.slots[0].id, { action: 'book', version: 0, child });
		await expect(removeMeetingDay(db, staff, body)).rejects.toMatchObject({ status: 409 });
		expect((await meetingData(db, staff)).slots).toHaveLength(2);
	});
	it('does not remove times absent from the confirmation, other days, or another teacher’s times', async () => {
		const { db, staff, offer } = await fixture();
		const colleague = createId();
		await db.prepare('INSERT INTO teachers VALUES(?,?,?)').bind(colleague, 0, 'profile').run();
		await db
			.prepare('INSERT INTO teacher_classrooms VALUES(?,?)')
			.bind(colleague, offer.classroom)
			.run();
		const later = {
			...offer,
			id: createId(),
			slots: offer.slots.map((s) => ({
				...s,
				id: createId(),
				start: s.start + 86400000,
				end: s.end + 86400000
			}))
		};
		await publishMeetings(db, { ...staff, teacher: colleague }, later);
		const slots = (await meetingData(db, staff)).slots.filter((s) => s.offer === offer.id);
		await expect(
			removeMeetingDay(db, staff, request(offer.classroom, slots.slice(0, 1)))
		).rejects.toMatchObject({ status: 409 });
		await removeMeetingDay(db, staff, request(offer.classroom, slots));
		const remaining = (await meetingData(db, staff)).slots;
		expect(remaining).toHaveLength(2);
		await expect(
			removeMeetingDay(db, staff, request(offer.classroom, remaining))
		).rejects.toMatchObject({ status: 409 });
		await removeMeetingDay(db, { ...staff, admin: true }, request(offer.classroom, remaining));
		expect((await meetingData(db, staff)).slots).toEqual([]);
	});
	it('rejects invalid dates, foreign classrooms, and times that have started', async () => {
		const { db, staff, offer, otherClassroom } = await fixture();
		const body = request(offer.classroom, (await meetingData(db, staff)).slots);
		await expect(
			removeMeetingDay(db, staff, { ...body, date: '2026-02-30' })
		).rejects.toMatchObject({ status: 400 });
		await expect(
			removeMeetingDay(db, staff, { ...body, classroom: otherClassroom })
		).rejects.toMatchObject({ status: 409 });
		await expect(removeMeetingDay(db, staff, body, offer.slots[1].end)).rejects.toMatchObject({
			status: 409
		});
		expect((await meetingData(db, staff)).slots).toHaveLength(2);
	});
});

it('notifies only affected families once per device when several bookings are removed', async () => {
	const { db, staff, parent, second, other, offer, child } = await fixture();
	for (const who of [staff, parent, second, other]) {
		const id = who.kind === 'staff' ? who.teacher : who.family;
		await db
			.prepare(
				'INSERT INTO credentials(id,teacher_id,family_id,auth_token_hash,wrapped_key) VALUES(?,?,?,?,?)'
			)
			.bind(id, who.kind === 'staff' ? id : null, who.kind === 'family' ? id : null, id, 'key')
			.run();
		await db
			.prepare('INSERT INTO sessions VALUES(?,?,?)')
			.bind(id, id, Date.now() + 86400000)
			.run();
		await db
			.prepare('INSERT INTO push_subscriptions VALUES(?,?)')
			.bind(`https://push.example/${id}`, id)
			.run();
	}
	const sent: PushMessage[] = [];
	const event = {
		platform: {
			env: {
				DB: db,
				NOTIFICATIONS: {
					send: async (message: PushMessage) => {
						sent.push(message);
					}
				}
			}
		},
		url: new URL('https://example.com')
	} as unknown as Parameters<typeof announceMeetingChanges>[0];
	await announceMeetingChanges(
		event,
		[
			{ offer: offer.id, child },
			{ offer: offer.id, child }
		],
		staff.teacher
	);
	expect(sent.flatMap((s) => s.endpoints).sort()).toEqual(
		[`https://push.example/${parent.family}`, `https://push.example/${second.family}`].sort()
	);
});
