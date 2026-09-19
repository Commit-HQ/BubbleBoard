import { decryptData, encryptData, fields, UnreadableError } from '$lib/crypto';

export type MessageSettings = {
	classroom: string;
	enabled: boolean;
	monthlyLimit: number;
	schedule: ({ start: string; end: string } | null)[];
	revision: number;
};
/** A classroom's settings with what this family has spent of them; when it may send, its device works out. */
export type MessagePolicy = MessageSettings & { used: number };
export type ConversationRecord = {
	id: string;
	family: string;
	classroom: string;
	title: string;
	closed: number;
	createdAt: number;
	lastSequence: number;
	readSequence: number;
	content: string;
	messageId: string;
	author: string;
	postedAt: number;
};
export type MessageRecord = {
	id: string;
	sequence: number;
	author: string;
	content: string;
	postedAt: number;
};
export type MessageContent = { text: string; name: string };
export type Conversation = ConversationRecord & { subject: string; preview: string };
export type OpenMessage = MessageRecord & MessageContent;
/** Keep history only when the pages overlap; otherwise restart pagination from the new page. */
export function mergeRecentMessages<T extends MessageRecord>(rows: T[], opened: T[]): T[] {
	if (!opened.some((fresh) => rows.some((row) => row.sequence === fresh.sequence))) return opened;
	const oldest = opened[0]?.sequence ?? Infinity;
	return [...rows.filter((row) => row.sequence < oldest), ...opened];
}
export type Inbox = {
	conversations: ConversationRecord[];
	policies: MessagePolicy[];
	family: string | null;
};
export const defaultSchedule = () =>
	Array.from({ length: 5 }, () => ({ start: '08:00', end: '16:00' }));
/** What a classroom starts with when an admin first opens its messaging settings. */
export const defaultMonthlyLimit = 3;
/** The kindergarten's own timezone: every hour the app shows or reckons with is read in it. */
export const zone = 'Europe/Zagreb';
// A formatter is slow to make, and these run for every message on the screen, so each is made once.
const clockFormat = new Intl.DateTimeFormat('en-GB', {
	timeZone: zone,
	year: 'numeric',
	month: '2-digit',
	day: '2-digit',
	weekday: 'short',
	hour: '2-digit',
	minute: '2-digit',
	hourCycle: 'h23'
});
/** Keeps one formatter per language, made the first time that language asks for it. */
export function perLocale(options: Intl.DateTimeFormatOptions) {
	const made: Record<string, Intl.DateTimeFormat> = {};
	return (locale: string) =>
		(made[locale] ??= new Intl.DateTimeFormat(locale, { timeZone: zone, ...options }));
}

/** The kindergarten's own clock: sending hours, calendar months, and the days a conversation is grouped by. */
export function messageClock(now = Date.now()) {
	const parts = clockFormat.formatToParts(now);
	const value = (type: string) => parts.find((part) => part.type === type)!.value;
	return {
		date: `${value('year')}-${value('month')}-${value('day')}`,
		month: `${value('year')}-${value('month')}`,
		day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(value('weekday')),
		time: `${value('hour')}:${value('minute')}`
	};
}
const clockMinutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
/**
 * How many minutes a family may still send for today, or nothing at all when this classroom isn't taking
 * messages at this moment. Families' devices work it out as the clock runs, so a window closes when it
 * closes rather than at the next refresh; the server decides every send for itself.
 */
export function sendingLeft(settings: MessageSettings, now = Date.now()) {
	const { day, time } = messageClock(now);
	const hours = settings.schedule[day];
	if (!settings.enabled || !hours || time < hours.start || time >= hours.end) return undefined;
	return clockMinutes(hours.end) - clockMinutes(time);
}
export const sendingAllowed = (settings: MessageSettings, now = Date.now()) =>
	sendingLeft(settings, now) !== undefined;
/** How close to the end of a window a family is told that it's about to close. */
export const closingSoon = 30;
/** Who wrote a message: `teacher:<id>` or `family:<id>`, as the server keeps it. */
export const byTeacher = (author: string) => author.startsWith('teacher:');
/** How many messages a family may still send this month before a teacher answers. */
export const remainingMessages = (policy: MessagePolicy) =>
	Math.max(0, policy.monthlyLimit - policy.used);
/**
 * Whether a family's next message in a conversation spends one of the month's allowance. Answering a
 * teacher is free; starting a conversation, and writing again before an answer comes, is not.
 */
export const chargesAllowance = (latest: string | undefined) => !latest || !byTeacher(latest);
const timeFormat = perLocale({ timeStyle: 'short' });
const dateFormat = perLocale({ dateStyle: 'long' });
const shortDateFormat = perLocale({ day: 'numeric', month: 'numeric' });
/** When a message was sent, in the kindergarten's time: `14:05`. */
export const messageTime = (locale: string, time: number) => timeFormat(locale).format(time);
/** The day a message was sent, for the chip above the first message of each day. */
export const messageDate = (locale: string, time: number) => dateFormat(locale).format(time);
/** The day a conversation last moved, for the inbox, where a day older than today shows as `4/3`. */
export const messageShortDate = (locale: string, time: number) =>
	shortDateFormat(locale).format(time);
export function sealSubject(title: string, key: CryptoKey, classroom: string, id: string) {
	return encryptData({ title }, key, { purpose: 'conversation-title', classroom, message: id });
}
export function sealMessage(
	content: MessageContent,
	key: CryptoKey,
	classroom: string,
	id: string,
	conversation: string
) {
	return encryptData({ ...content, conversation }, key, {
		purpose: 'private-message',
		classroom,
		message: id
	});
}
export async function openMessage(
	record: MessageRecord,
	key: CryptoKey,
	classroom: string,
	conversation: string
): Promise<OpenMessage> {
	const data = fields(
		await decryptData(record.content, key, {
			purpose: 'private-message',
			classroom,
			message: record.id
		})
	);
	if (
		typeof data.text !== 'string' ||
		!data.text.trim() ||
		data.text.length > 4000 ||
		typeof data.name !== 'string' ||
		data.name.length > 200 ||
		data.conversation !== conversation
	)
		throw new UnreadableError();
	return { ...record, text: data.text, name: data.name };
}
export async function openConversation(
	record: ConversationRecord,
	key: CryptoKey,
	previous?: { key: CryptoKey; conversation: Conversation }
): Promise<Conversation> {
	const cached =
		previous?.key === key &&
		previous.conversation.id === record.id &&
		previous.conversation.family === record.family &&
		previous.conversation.classroom === record.classroom
			? previous.conversation
			: undefined;
	const data =
		cached?.title === record.title
			? { title: cached.subject }
			: fields(
					await decryptData(record.title, key, {
						purpose: 'conversation-title',
						classroom: record.classroom,
						message: record.id
					})
				);
	if (typeof data.title !== 'string' || !data.title.trim() || data.title.length > 120)
		throw new UnreadableError();
	const latest =
		cached?.content === record.content && cached.messageId === record.messageId
			? { text: cached.preview }
			: await openMessage(
					{
						id: record.messageId,
						content: record.content,
						author: record.author,
						sequence: record.lastSequence,
						postedAt: record.postedAt
					},
					key,
					record.classroom,
					record.id
				);
	return { ...record, subject: data.title, preview: latest.text };
}
