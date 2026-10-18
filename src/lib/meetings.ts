import { messageClock, messageTime, perLocale } from '$lib/messages';

export type MeetingSlot = {
	id: string;
	offer: string;
	classroom: string;
	teacher: string | null;
	start: number;
	end: number;
	booked: boolean;
	mine: boolean;
	/** Whether staff booked it for the family, which staff and that family see. */
	staffBooked: boolean;
	child: string | null;
	version: number;
};
export type MeetingInvite = { offer: string; child: string; family: string; label: string };
/** The children each offer invites, which staff choose from to book a time for a family. */
export type MeetingInvited = { offer: string; child: string };
export type MeetingData = {
	slots: MeetingSlot[];
	invites: MeetingInvite[];
	/** Staff's alone: a family books from its own `invites`. */
	invited: MeetingInvited[];
};
export type MeetingChild = MeetingInvite & { name: string };
export type NewMeetingOffer = {
	id: string;
	classroom: string;
	revision: number;
	slots: { id: string; start: number; end: number }[];
	invites: { child: string; family: string; label: string }[];
};
/** Converts a kindergarten wall-clock time, independently of the device's timezone. */
export function meetingTimestamp(date: string, time: string): number {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) return NaN;
	const wall = Date.parse(`${date}T${time}:00Z`);
	if (!Number.isFinite(wall)) return NaN;
	let result = wall;
	for (let i = 0; i < 3; i++) {
		const local = messageClock(result);
		const actual = Date.parse(`${local.date}T${local.time}:00Z`);
		result += wall - actual;
	}
	const local = messageClock(result);
	return local.date === date && local.time === time ? result : NaN;
}
/**
 * A new time offered after the last: it starts when that one ends and lasts as long, within the day. Nothing
 * when the day has no room left for a meeting of five minutes.
 */
export function nextMeetingTime(last?: { from: string; to: string }) {
	const clock = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
	if (!last || !clock.test(last.from) || !clock.test(last.to))
		return { from: '16:00', to: '16:20' };
	const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
	const length = minutes(last.to) - minutes(last.from);
	const end = Math.min(minutes(last.to) + (length > 0 ? length : 20), 23 * 60 + 59);
	if (end - minutes(last.to) < 5) return undefined;
	const pad = (n: number) => String(n).padStart(2, '0');
	return { from: last.to, to: `${pad(Math.floor(end / 60))}:${pad(end % 60)}` };
}
const dayFormat = perLocale({ dateStyle: 'full' });
/** The day a meeting falls on, written in full over the times offered that day. */
export const meetingDay = (locale: string, time: number) => dayFormat(locale).format(time);
/** A meeting's time reads like a message's, and is the same clock. */
export const meetingTime = messageTime;
