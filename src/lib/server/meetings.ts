import { error, isHttpError } from '@sveltejs/kit';
import type { Identity, Staff } from '$lib/api';
import {
	meetingTimestamp,
	type MeetingData,
	type MeetingSlot,
	type NewMeetingOffer
} from '$lib/meetings';
import { isId } from '$lib/crypto';
import { checkClassrooms, managesOthers, transaction, visibleClassrooms } from './database';
import { fields, id, invalid, list, revision, sealed } from './validate';

/** A time offered: it must be ahead, within the year, and long enough to meet in but not a whole afternoon. */
function offeredSlot(value: unknown, now: number) {
	const slot = fields(value);
	const start = Number(slot.start),
		end = Number(slot.end);
	if (
		!Number.isSafeInteger(slot.start) ||
		!Number.isSafeInteger(slot.end) ||
		start <= now ||
		start > now + 366 * 86400000 ||
		end - start < 5 * 60000 ||
		end - start > 120 * 60000
	)
		invalid();
	return { id: id(slot.id), start, end };
}
/** Each invited child's name, sealed for one family; the server never sees which child it names. */
function invitation(value: unknown) {
	const invite = fields(value);
	return { child: id(invite.child), family: id(invite.family), label: sealed(invite.label, 2048) };
}
export function parseOffer(body: Record<string, unknown>, now = Date.now()): NewMeetingOffer {
	const slots = list(body.slots, (value) => offeredSlot(value, now), 100);
	const invites = list(body.invites, invitation);
	if (
		!slots.length ||
		new Set(slots.map((slot) => slot.id)).size !== slots.length ||
		new Set(invites.map((invite) => `${invite.child}:${invite.family}`)).size !== invites.length
	)
		invalid();
	return {
		id: id(body.id),
		classroom: id(body.classroom),
		revision: revision(body.revision),
		slots,
		invites
	};
}
export async function meetingData(db: D1Database, who: Identity): Promise<MeetingData> {
	const [visible, params] = visibleClassrooms(who);
	const family = who.kind === 'family' ? who.family : '';
	const { results } = await db
		.prepare(
			`SELECT s.id,s.offer_id AS offer,o.classroom_id AS classroom,o.teacher_id AS teacher,
 s.starts_at AS start,s.ends_at AS end,s.child_id AS child,s.version,s.staff_booked AS staffBooked,
 EXISTS(SELECT 1 FROM meeting_invites i JOIN family_classrooms f ON f.family_id=i.family_id AND f.classroom_id=o.classroom_id
 WHERE i.offer_id=o.id AND i.child_id=s.child_id AND i.family_id=?) AS mine
 FROM meeting_slots s JOIN meeting_offers o ON o.id=s.offer_id WHERE o.classroom_id IN (${visible}) ORDER BY s.starts_at,s.id`
		)
		.bind(family, ...params)
		.all<
			Omit<MeetingSlot, 'mine' | 'booked' | 'staffBooked'> & { mine: number; staffBooked: number }
		>();
	const slots = results.map((s) => {
		// Who booked a time, like whose child it is, is for staff and the child's families alone.
		const shown = who.kind === 'staff' || !!s.mine;
		return {
			...s,
			booked: !!s.child,
			mine: !!s.mine,
			child: shown ? s.child : null,
			staffBooked: shown && !!s.child && !!s.staffBooked
		};
	});
	const invites =
		who.kind === 'family'
			? (
					await db
						.prepare(
							`SELECT i.offer_id AS offer,i.child_id AS child,i.family_id AS family,i.label
 FROM meeting_invites i JOIN meeting_offers o ON o.id=i.offer_id JOIN children c ON c.id=i.child_id AND c.classroom_id=o.classroom_id
 JOIN family_classrooms f ON f.family_id=i.family_id AND f.classroom_id=o.classroom_id WHERE i.family_id=?`
						)
						.bind(family)
						.all<MeetingData['invites'][number]>()
				).results
			: [];
	// The children staff may book for: invited, and still in the classroom with a family that is too, as booking
	// checks.
	const invited =
		who.kind === 'staff'
			? (
					await db
						.prepare(
							`SELECT DISTINCT i.offer_id AS offer,i.child_id AS child
 FROM meeting_invites i JOIN meeting_offers o ON o.id=i.offer_id JOIN children c ON c.id=i.child_id AND c.classroom_id=o.classroom_id
 JOIN family_classrooms f ON f.family_id=i.family_id AND f.classroom_id=o.classroom_id WHERE o.classroom_id IN (${visible})`
						)
						.bind(...params)
						.all<MeetingData['invited'][number]>()
				).results
			: [];
	return { slots, invites, invited };
}
export async function publishMeetings(db: D1Database, who: Staff, offer: NewMeetingOffer) {
	await checkClassrooms(db, who, [offer.classroom]);
	// Bind the invitations to the catalog used by the teacher, in the same transaction as publication.
	const statements = [
		db
			.prepare(
				`INSERT INTO meeting_offers(id,classroom_id,teacher_id,created_at)
 VALUES(?,CASE WHEN (SELECT revision FROM installation WHERE id=1)=? THEN ? ELSE NULL END,?,?)`
			)
			.bind(offer.id, offer.revision, offer.classroom, who.teacher, Date.now()),
		db
			.prepare(
				`INSERT INTO meeting_slots(id,offer_id,starts_at,ends_at)
 SELECT json_extract(value,'$.id'),?,json_extract(value,'$.start'),json_extract(value,'$.end') FROM json_each(?)`
			)
			.bind(offer.id, JSON.stringify(offer.slots)),
		db
			.prepare(
				`INSERT INTO meeting_invites(offer_id,child_id,family_id,label)
 SELECT ?,CASE WHEN EXISTS(SELECT 1 FROM children WHERE id=json_extract(value,'$.child') AND classroom_id=?) THEN json_extract(value,'$.child') ELSE NULL END,
 CASE WHEN EXISTS(SELECT 1 FROM family_classrooms WHERE family_id=json_extract(value,'$.family') AND classroom_id=?) THEN json_extract(value,'$.family') ELSE NULL END,json_extract(value,'$.label') FROM json_each(?)`
			)
			.bind(offer.id, offer.classroom, offer.classroom, JSON.stringify(offer.invites))
	];
	// Each statement leaves a required column empty when what it depends on has moved — a stale catalog, a
	// child who changed classroom, a family who left — which `transaction` reports as a conflict.
	await transaction(db, statements);
}
/**
 * Conditional writes make booking/cancellation safe even with stale pages and simultaneous requests. It
 * answers with the booking that changed, which its families and teachers are told about, or nothing when a
 * free time was simply withdrawn.
 */
export async function changeMeeting(
	db: D1Database,
	who: Identity,
	id: string,
	body: Record<string, unknown>,
	now = Date.now()
) {
	if (
		!isId(id) ||
		!Number.isSafeInteger(body.version) ||
		!['book', 'cancel', 'remove'].includes(String(body.action))
	)
		invalid();
	const [visible, params] = visibleClassrooms(who);
	const slot = await db
		.prepare(
			`SELECT s.id,s.offer_id AS offer,s.child_id AS child,o.classroom_id AS classroom,o.teacher_id AS teacher FROM meeting_slots s JOIN meeting_offers o ON o.id=s.offer_id WHERE s.id=? AND o.classroom_id IN (${visible})`
		)
		.bind(id, ...params)
		.first<{
			id: string;
			offer: string;
			child: string | null;
			classroom: string;
			teacher: string | null;
		}>();
	if (!slot) error(404, 'missing');
	// The head and the classroom's lead settle any teacher's times there; a teacher only her own.
	if (who.kind === 'staff' && !managesOthers(who) && slot.teacher !== who.teacher)
		error(403, 'forbidden');
	let sql: string, values: unknown[];
	/** Whose meeting moved, taken where the request was checked rather than read from the body again. */
	let booking: { offer: string; child: string } | null = null;
	if (body.action === 'book') {
		if (!isId(body.child)) invalid();
		booking = { offer: slot.offer, child: body.child };
		// A family books for its own child, and staff for any child the offer invites, for the child's families,
		// who see who booked it and cancel it as they would their own.
		const family = who.kind === 'family' ? ' AND i.family_id=?' : '';
		sql = `UPDATE meeting_slots SET child_id=?,staff_booked=?,version=version+1 WHERE id=? AND version=? AND child_id IS NULL AND starts_at>?
 AND EXISTS(SELECT 1 FROM meeting_invites i JOIN children c ON c.id=i.child_id AND c.classroom_id=? JOIN family_classrooms f ON f.family_id=i.family_id AND f.classroom_id=c.classroom_id WHERE i.offer_id=meeting_slots.offer_id AND i.child_id=?${family})`;
		values = [
			body.child,
			Number(who.kind === 'staff'),
			id,
			body.version,
			now,
			slot.classroom,
			body.child
		];
		if (who.kind === 'family') values.push(who.family);
	} else {
		if (body.action === 'remove') {
			if (who.kind !== 'staff') error(403, 'forbidden');
			sql =
				'DELETE FROM meeting_slots WHERE id=? AND version=? AND child_id IS NULL AND starts_at>?';
			values = [id, body.version, now];
		} else {
			booking = slot.child ? { offer: slot.offer, child: slot.child } : null;
			sql =
				'UPDATE meeting_slots SET child_id=NULL,version=version+1 WHERE id=? AND version=? AND child_id IS NOT NULL AND starts_at>?';
			values = [id, body.version, now];
			if (who.kind === 'family') {
				sql +=
					' AND EXISTS(SELECT 1 FROM meeting_invites i WHERE i.offer_id=meeting_slots.offer_id AND i.child_id=meeting_slots.child_id AND i.family_id=?)';
				values.push(who.family);
			}
		}
	}
	try {
		const result = await db
			.prepare(sql)
			.bind(...values)
			.run();
		if (!result.meta.changes) error(409, 'meeting-changed');
	} catch (cause) {
		if (String(cause).includes('UNIQUE constraint')) error(409, 'meeting-already-booked');
		throw cause;
	}
	return booking;
}

/**
 * Replaces an offer's upcoming free times with the ones a teacher set, in one transaction. Booked times stay as
 * they are, and a time kept with its ID and clock stays too. The change is refused when the offer's times moved
 * since her device read them (`expected`), such as when a parent booked one meanwhile. A time that started since
 * then is no change: it stays as it was.
 */
export async function changeMeetingTimes(
	db: D1Database,
	who: Staff,
	body: Record<string, unknown>,
	now = Date.now()
) {
	const offer = id(body.offer);
	const slots = list(body.slots, (value) => offeredSlot(value, now), 100);
	const expected = list(
		body.expected,
		(value) => {
			const slot = fields(value);
			return { id: id(slot.id), version: revision(slot.version) };
		},
		300
	);
	if (
		new Set(slots.map((slot) => slot.id)).size !== slots.length ||
		new Set(expected.map((slot) => slot.id)).size !== expected.length
	)
		invalid();
	const [visible, params] = visibleClassrooms(who);
	const found = await db
		.prepare(
			`SELECT teacher_id AS teacher FROM meeting_offers WHERE id=? AND classroom_id IN (${visible})`
		)
		.bind(offer, ...params)
		.first<{ teacher: string | null }>();
	if (!found) error(404, 'missing');
	if (!managesOthers(who) && found.teacher !== who.teacher) error(403, 'forbidden');
	const times = JSON.stringify(slots);
	try {
		await transaction(db, [
			// Empties the offer's classroom unless every upcoming time is one the device read, and every time it
			// read is still there as it was.
			db
				.prepare(
					`UPDATE meeting_offers SET classroom_id=CASE WHEN
 NOT EXISTS(SELECT 1 FROM meeting_slots s WHERE s.offer_id=?1 AND s.starts_at>?2 AND NOT EXISTS(
 SELECT 1 FROM json_each(?3) WHERE json_extract(value,'$.id')=s.id AND json_extract(value,'$.version')=s.version))
 AND NOT EXISTS(SELECT 1 FROM json_each(?3) e WHERE NOT EXISTS(SELECT 1 FROM meeting_slots s WHERE s.offer_id=?1
 AND s.id=json_extract(e.value,'$.id') AND s.version=json_extract(e.value,'$.version')))
 THEN classroom_id ELSE NULL END WHERE id=?1`
				)
				.bind(offer, now, JSON.stringify(expected)),
			db
				.prepare(
					`DELETE FROM meeting_slots WHERE offer_id=?1 AND starts_at>?2 AND child_id IS NULL AND NOT EXISTS(
 SELECT 1 FROM json_each(?3) WHERE json_extract(value,'$.id')=meeting_slots.id
 AND json_extract(value,'$.start')=meeting_slots.starts_at AND json_extract(value,'$.end')=meeting_slots.ends_at)`
				)
				.bind(offer, now, times),
			db
				.prepare(
					`INSERT INTO meeting_slots(id,offer_id,starts_at,ends_at)
 SELECT json_extract(value,'$.id'),?1,json_extract(value,'$.start'),json_extract(value,'$.end') FROM json_each(?2)
 WHERE NOT EXISTS(SELECT 1 FROM meeting_slots WHERE id=json_extract(value,'$.id'))`
				)
				.bind(offer, times)
		]);
	} catch (cause) {
		if (isHttpError(cause, 409) && cause.body.message === 'stale')
			error(409, 'meeting-times-changed');
		throw cause;
	}
}

/** Remove the staff member's upcoming times for one classroom/day, only if the confirmed list is current. */
export async function removeMeetingDay(
	db: D1Database,
	who: Staff,
	body: Record<string, unknown>,
	now = Date.now()
) {
	if (
		!isId(body.classroom) ||
		typeof body.date !== 'string' ||
		!Array.isArray(body.slots) ||
		!body.slots.length ||
		body.slots.length > 300
	)
		invalid();
	const start = meetingTimestamp(body.date as string, '00:00');
	if (!Number.isFinite(start)) invalid();
	const nextDate = new Date(Date.parse(`${body.date}T00:00:00Z`) + 86400000)
		.toISOString()
		.slice(0, 10);
	const end = meetingTimestamp(nextDate, '00:00');
	const slots = body.slots as { id: string; version: number }[];
	if (
		slots.some((s) => !s || !isId(s.id) || !Number.isSafeInteger(s.version)) ||
		new Set(slots.map((s) => s.id)).size !== slots.length
	)
		invalid();
	await checkClassrooms(db, who, [body.classroom as string]);
	const { results } = await db
		.prepare(
			`WITH targets AS MATERIALIZED (
 SELECT s.id,s.version FROM meeting_slots s JOIN meeting_offers o ON o.id=s.offer_id
 WHERE o.classroom_id=?1 AND (?2=1 OR o.teacher_id=?3) AND s.starts_at>=?4 AND s.starts_at<?5 AND s.starts_at>?6
 ), expected AS (SELECT json_extract(value,'$.id') AS id,json_extract(value,'$.version') AS version FROM json_each(?7))
 DELETE FROM meeting_slots WHERE id IN (SELECT id FROM targets)
 AND (SELECT COUNT(*) FROM targets)=(SELECT COUNT(*) FROM expected)
 AND NOT EXISTS(SELECT 1 FROM targets t LEFT JOIN expected e ON e.id=t.id AND e.version=t.version WHERE e.id IS NULL)
 RETURNING offer_id AS offer,child_id AS child`
		)
		.bind(
			body.classroom,
			Number(managesOthers(who)),
			who.teacher,
			start,
			end,
			now,
			JSON.stringify(slots)
		)
		.all<{ offer: string; child: string | null }>();
	if (!results.length) error(409, 'meeting-day-changed');
	return results;
}
