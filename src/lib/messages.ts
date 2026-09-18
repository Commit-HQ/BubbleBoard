import { decryptData, encryptData, fields, UnreadableError } from '$lib/crypto';

export type MessageSettings = {
	classroom: string;
	enabled: boolean;
	monthlyLimit: number;
	schedule: ({ start: string; end: string } | null)[];
	revision: number;
};
export type MessagePolicy = MessageSettings & { used: number; allowed: boolean };
export type ConversationRecord = {
	id: string;
	family: string;
	classroom: string;
	title: string;
	starter: string;
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
export type Inbox = {
	conversations: ConversationRecord[];
	policies: MessagePolicy[];
	family: string | null;
};
export const defaultSchedule = () =>
	Array.from({ length: 5 }, () => ({ start: '08:00', end: '16:00' }));
export function messageClock(now = Date.now()) {
	const parts = new Intl.DateTimeFormat('en-GB', {
		timeZone: 'Europe/Zagreb',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		weekday: 'short',
		hour: '2-digit',
		minute: '2-digit',
		hourCycle: 'h23'
	}).formatToParts(now);
	const value = (type: string) => parts.find((part) => part.type === type)!.value;
	return {
		month: `${value('year')}-${value('month')}`,
		day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(value('weekday')),
		time: `${value('hour')}:${value('minute')}`
	};
}
export function sendingAllowed(settings: MessageSettings, now = Date.now()) {
	const { day, time } = messageClock(now);
	const hours = settings.schedule[day];
	return settings.enabled && !!hours && time >= hours.start && time < hours.end;
}
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
	key: CryptoKey
): Promise<Conversation> {
	const data = fields(
		await decryptData(record.title, key, {
			purpose: 'conversation-title',
			classroom: record.classroom,
			message: record.id
		})
	);
	if (typeof data.title !== 'string' || !data.title.trim() || data.title.length > 120)
		throw new UnreadableError();
	const latest = await openMessage(
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
