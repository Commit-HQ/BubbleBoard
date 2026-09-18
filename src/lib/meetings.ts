import { messageClock } from '$lib/messages';

export type MeetingSlot = {
	id: string;
	offer: string;
	classroom: string;
	teacher: string | null;
	start: number;
	end: number;
	booked: boolean;
	mine: boolean;
	child: string | null;
	version: number;
};
export type MeetingInvite = { offer: string; child: string; family: string; label: string };
export type MeetingData = { slots: MeetingSlot[]; invites: MeetingInvite[] };
export type MeetingChild = MeetingInvite & { name: string };
export type NewMeetingOffer = {
	id: string;
	classroom: string;
	revision: number;
	slots: { id: string; start: number; end: number }[];
	invites: { child: string; family: string; label: string }[];
};
export const meetingZone = 'Europe/Zagreb';
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
export function generateMeetingSlots(date: string, from: string, to: string, minutes: number) {
	const start = meetingTimestamp(date, from),
		end = meetingTimestamp(date, to);
	if (
		!Number.isFinite(start) ||
		!Number.isFinite(end) ||
		!Number.isInteger(minutes) ||
		minutes < 5 ||
		minutes > 120 ||
		end <= start
	)
		return [];
	const result: { start: number; end: number }[] = [];
	for (
		let time = start;
		time + minutes * 60000 <= end && result.length < 100;
		time += minutes * 60000
	)
		result.push({ start: time, end: time + minutes * 60000 });
	return result;
}
export const meetingDay = (locale: string, time: number) =>
	new Intl.DateTimeFormat(locale, { dateStyle: 'full', timeZone: meetingZone }).format(time);
export const meetingTime = (locale: string, time: number) =>
	new Intl.DateTimeFormat(locale, { timeStyle: 'short', timeZone: meetingZone }).format(time);
