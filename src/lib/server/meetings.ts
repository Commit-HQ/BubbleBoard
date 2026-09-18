import { error } from '@sveltejs/kit';
import type { Identity, Staff } from '$lib/api';
import {
	meetingTimestamp,
	type MeetingData,
	type MeetingSlot,
	type NewMeetingOffer
} from '$lib/meetings';
import { isId, envelopeSize } from '$lib/crypto';
import { checkClassrooms, visibleClassrooms } from './database';

const invalid = (): never => error(400, 'invalid');
export function parseOffer(body: Record<string, unknown>, now = Date.now()): NewMeetingOffer {
	if (
		!isId(body.id) ||
		!isId(body.classroom) ||
		!Number.isInteger(body.revision) ||
		!Array.isArray(body.slots) ||
		body.slots.length < 1 ||
		body.slots.length > 100 ||
		!Array.isArray(body.invites) ||
		body.invites.length > 200
	)
		invalid();
	const slots = (body.slots as Record<string, unknown>[]).map((s) => {
		if (
			!s ||
			!isId(s.id) ||
			!Number.isSafeInteger(s.start) ||
			!Number.isSafeInteger(s.end) ||
			Number(s.start) <= now ||
			Number(s.start) > now + 366 * 86400000 ||
			Number(s.end) - Number(s.start) < 5 * 60000 ||
			Number(s.end) - Number(s.start) > 120 * 60000
		)
			invalid();
		return { id: s.id as string, start: s.start as number, end: s.end as number };
	});
	if (new Set(slots.map((s) => s.id)).size !== slots.length) invalid();
	const invites = (body.invites as Record<string, unknown>[]).map((i) => {
		const size = envelopeSize(i?.label);
		if (
			!i ||
			!isId(i.child) ||
			!isId(i.family) ||
			typeof i.label !== 'string' ||
			size === undefined ||
			size < 1 ||
			size > 2048
		)
			invalid();
		return { child: i.child as string, family: i.family as string, label: i.label as string };
	});
	if (new Set(invites.map((i) => `${i.child}:${i.family}`)).size !== invites.length) invalid();
	return {
		id: body.id as string,
		classroom: body.classroom as string,
		revision: body.revision as number,
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
 s.starts_at AS start,s.ends_at AS end,s.child_id AS child,s.version,
 EXISTS(SELECT 1 FROM meeting_invites i JOIN family_classrooms f ON f.family_id=i.family_id AND f.classroom_id=o.classroom_id
 WHERE i.offer_id=o.id AND i.child_id=s.child_id AND i.family_id=?) AS mine
 FROM meeting_slots s JOIN meeting_offers o ON o.id=s.offer_id WHERE o.classroom_id IN (${visible}) ORDER BY s.starts_at,s.id`
		)
		.bind(family, ...params)
		.all<Omit<MeetingSlot, 'mine' | 'booked'> & { mine: number }>();
	const slots = results.map((s) => ({
		...s,
		booked: !!s.child,
		mine: !!s.mine,
		child: who.kind === 'staff' || s.mine ? s.child : null
	}));
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
	return { slots, invites };
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
	try {
		await db.batch(statements);
	} catch (cause) {
		const msg = String(cause);
		if (msg.includes('meeting-overlap')) error(409, 'meeting-overlap');
		if (msg.includes('constraint')) error(409, 'stale');
		throw cause;
	}
}
/** Conditional writes make booking/cancellation safe even with stale pages and simultaneous requests. */
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
	let sql: string, values: unknown[];
	if (body.action === 'book') {
		if (who.kind !== 'family') error(403, 'forbidden');
		if (!isId(body.child)) invalid();
		sql = `UPDATE meeting_slots SET child_id=?,version=version+1 WHERE id=? AND version=? AND child_id IS NULL AND starts_at>?
 AND EXISTS(SELECT 1 FROM meeting_invites i JOIN children c ON c.id=i.child_id AND c.classroom_id=? JOIN family_classrooms f ON f.family_id=i.family_id AND f.classroom_id=c.classroom_id WHERE i.offer_id=meeting_slots.offer_id AND i.child_id=? AND i.family_id=?)`;
		values = [body.child, id, body.version, now, slot.classroom, body.child, who.family];
	} else {
		if (who.kind === 'staff' && !who.admin && slot.teacher !== who.teacher) error(403, 'forbidden');
		if (body.action === 'remove') {
			if (who.kind !== 'staff') error(403, 'forbidden');
			sql =
				'DELETE FROM meeting_slots WHERE id=? AND version=? AND child_id IS NULL AND starts_at>?';
			values = [id, body.version, now];
		} else {
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
	return slot;
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
		.bind(body.classroom, who.admin ? 1 : 0, who.teacher, start, end, now, JSON.stringify(slots))
		.all<{ offer: string; child: string | null }>();
	if (!results.length) error(409, 'meeting-day-changed');
	return results;
}
