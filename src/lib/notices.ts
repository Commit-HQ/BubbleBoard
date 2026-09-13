import type { NoticeRecord, VoteRecord } from '$lib/api';
import { fromBase64Url } from '$lib/base64url';
import {
	createKey,
	decryptData,
	encryptData,
	envelopeSize,
	isId,
	KEY_BYTES,
	UnreadableError,
	unwrapKey,
	wrapping
} from '$lib/crypto';
import { isFileName, maxNoticeFiles, type NoticeFile } from '$lib/files';

// Notices on the board, as devices write and read them (docs/access-format.md). Every save seals a notice
// under a new Notice Key, wrapped with the Group Key of each of its classrooms, so a classroom taken off a
// notice can't open its later versions. A notice can hold a poll, and each family's answer is encrypted with
// its own Family Key, so only that family and staff read it. It can carry files, whose names and keys it
// holds (src/lib/files.ts). The server stores envelopes and decides who may post, read, and answer.

/** How long a notice stays up, in days from when it was first posted. The server accepts only these. */
export const noticeDays = [1, 3, 7, 14, 30, 60, 90] as const;
export const defaultNoticeDays = 30;
/** A day in milliseconds, as a notice's days are counted. */
export const day = 24 * 60 * 60 * 1000;

/** A notice's background. Every text colour stays readable on each. */
export const papers = ['white', 'yellow', 'peach', 'pink', 'lilac', 'blue', 'green'] as const;
export type Paper = (typeof papers)[number];

/** The colours text can take besides ink. */
export const textColours = ['red', 'orange', 'green', 'blue', 'purple'] as const;
export type TextColour = (typeof textColours)[number];

export type NoticeMark =
	| { type: 'bold' }
	| { type: 'italic' }
	| { type: 'link'; attrs: { href: string } }
	| { type: 'colour'; attrs: { colour: TextColour } };
export type NoticeInline =
	{ type: 'text'; text: string; marks?: NoticeMark[] } | { type: 'hardBreak' };
export type NoticeBlock =
	| { type: 'paragraph'; content?: NoticeInline[] }
	| { type: 'bulletList'; content: NoticeListItem[] }
	| { type: 'orderedList'; attrs: { start: number }; content: NoticeListItem[] };
export type NoticeListItem = { type: 'listItem'; content: NoticeBlock[] };
/** A notice's text, in the part of Tiptap's JSON document format the notice editor writes. */
export type NoticeDocument = { type: 'doc'; content: NoticeBlock[] };

/** An answer a poll offers. Its ID stays when its words change, which keeps the votes for it. */
export type PollOption = { id: string; text: string };
/** A poll on a notice: the notice's text asks, and each family chooses one of the options. */
export type Poll = { options: PollOption[] };
export const minPollOptions = 2;
export const maxPollOptions = 10;
/** The longest an option may be, in characters. */
export const maxOptionLength = 100;

/** What a notice holds inside its envelope. A notice posted with the recovery card has no author. */
export type NoticeContent = {
	author?: string;
	paper: Paper;
	body: NoticeDocument;
	poll?: Poll;
	files?: NoticeFile[];
};

/** A family's answer to a notice's poll, as a device that opened it shows it. */
export type Vote = { family: string; option: string };

/**
 * A notice as a device shows it, with those of its classrooms the device belongs to, and the answers to its
 * poll the device can read.
 */
export type Notice = Omit<NoticeRecord, 'content' | 'classrooms' | 'votes'> &
	NoticeContent & { classrooms: string[]; votes: Vote[] };

/**
 * The Family Key a device reads a family's answers with: a family device holds only its own, and a staff
 * device opens those of the families in its catalog.
 */
export type FamilyKeys = (family: string) => Promise<CryptoKey | undefined>;

const maxListDepth = 4;
const maxNodes = 4000;
const maxLinkLength = 2048;

function fail(): never {
	throw new UnreadableError();
}

function fields(value: unknown) {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: fail();
}

function list<T>(value: unknown, read: (item: unknown) => T) {
	return Array.isArray(value) ? value.map(read) : fail();
}

/**
 * A notice's text as a device may show it: only the nodes and marks above, links only to `https:` and
 * `mailto:` addresses, and colours only from the palette. Anyone holding a classroom's Group Key could have
 * written it, so boards read it through here and render the result with the app's own components.
 */
export function readDocument(value: unknown): NoticeDocument {
	let nodes = 0;
	const node = (item: unknown) => (++nodes > maxNodes ? fail() : fields(item));
	const mark = (item: unknown): NoticeMark => {
		const { type, attrs } = fields(item);
		if (type === 'bold' || type === 'italic') return { type };
		if (type === 'link') return { type, attrs: { href: readHref(fields(attrs).href) } };
		const colour = type === 'colour' ? fields(attrs).colour : undefined;
		return textColours.includes(colour as TextColour)
			? { type: 'colour', attrs: { colour: colour as TextColour } }
			: fail();
	};
	const inline = (item: unknown): NoticeInline => {
		const { type, text, marks } = node(item);
		if (type === 'hardBreak') return { type };
		if (type !== 'text' || typeof text !== 'string' || !text) fail();
		return marks === undefined ? { type, text } : { type, text, marks: list(marks, mark) };
	};
	const block = (item: unknown, depth: number): NoticeBlock => {
		const { type, attrs, content } = node(item);
		if (type === 'paragraph') {
			return content === undefined ? { type } : { type, content: list(content, inline) };
		}
		if ((type !== 'bulletList' && type !== 'orderedList') || depth >= maxListDepth) fail();
		const items = list(content, (child) => listItem(child, depth + 1));
		if (!items.length) fail();
		if (type === 'bulletList') return { type, content: items };
		const start = attrs === undefined ? 1 : (fields(attrs).start ?? 1);
		if (!Number.isSafeInteger(start) || (start as number) < 0) fail();
		return { type, attrs: { start: start as number }, content: items };
	};
	const listItem = (item: unknown, depth: number): NoticeListItem => {
		const { type, content } = node(item);
		if (type !== 'listItem') fail();
		const blocks = list(content, (child) => block(child, depth));
		return blocks.length ? { type, content: blocks } : fail();
	};
	const { type, content } = node(value);
	return type === 'doc' ? { type, content: list(content, (child) => block(child, 0)) } : fail();
}

/** Whether a notice may link to an address: web pages over https, and email addresses. */
export function allowedLink(value: string) {
	if (value.length > maxLinkLength || !URL.canParse(value)) return false;
	const { protocol } = new URL(value);
	return protocol === 'https:' || protocol === 'mailto:';
}

function readHref(value: unknown) {
	return typeof value === 'string' && allowedLink(value) ? value : fail();
}

/** A poll as a device may show it: two to ten options, each with an ID of its own and a few words. */
function readPoll(value: unknown): Poll {
	const options = list(fields(value).options, (item) => {
		const { id, text } = fields(item);
		const words = typeof text === 'string' && text.trim() && text.length <= maxOptionLength;
		return isId(id) && words ? { id, text: text as string } : fail();
	});
	const distinct = new Set(options.map((option) => option.id)).size === options.length;
	const count = options.length >= minPollOptions && options.length <= maxPollOptions;
	return distinct && count ? { options } : fail();
}

/**
 * A notice's files as a device may show them: up to ten, each once, with a name of a kind notices carry, a
 * size, and a key. Anyone holding a classroom's Group Key could have written them.
 */
function readFiles(value: unknown): NoticeFile[] {
	const files = list(value, (item) => {
		const { id, name, bytes, key } = fields(item);
		const sized = Number.isSafeInteger(bytes) && (bytes as number) >= 0;
		const keyed = typeof key === 'string' && fromBase64Url(key)?.length === KEY_BYTES;
		return isId(id) && isFileName(name) && sized && keyed
			? { id, name, bytes: bytes as number, key: key as string }
			: fail();
	});
	const distinct = new Set(files.map((file) => file.id)).size === files.length;
	return distinct && files.length <= maxNoticeFiles ? files : fail();
}

function readContent(value: unknown): NoticeContent {
	const { author, paper, body, poll, files } = fields(value);
	if (author !== undefined && (typeof author !== 'string' || !author)) fail();
	if (!papers.includes(paper as Paper)) fail();
	const content: NoticeContent = { paper: paper as Paper, body: readDocument(body) };
	if (author !== undefined) content.author = author as string;
	if (poll !== undefined) content.poll = readPoll(poll);
	if (files !== undefined) content.files = readFiles(files);
	return content;
}

/** The most a notice's content may take, in bytes of JSON, which the server also holds it to. */
export const maxNoticeBytes = 32 * 1024;

/** A notice too long to store. A long notice with formatting stays well below the limit. */
export class NoticeTooLongError extends Error {
	readonly code = 'notice-too-long';

	constructor() {
		super('Notice too long');
		this.name = 'NoticeTooLongError';
	}
}

/** Seals a notice, as a device posts or changes it, under a new Notice Key for each of its classrooms. */
export async function sealNotice(
	id: string,
	content: NoticeContent,
	classrooms: { id: string; groupKey: CryptoKey }[]
) {
	const { key, envelopes } = await createKey(
		classrooms.map((classroom) =>
			wrapping.noticeKeyForClassroom(classroom.groupKey, classroom.id, id)
		)
	);
	const sealed = await encryptData(content, key, { purpose: 'notice-content', notice: id });
	// Measured as the server measures it.
	if (envelopeSize(sealed)! > maxNoticeBytes) throw new NoticeTooLongError();
	return {
		content: sealed,
		classrooms: classrooms.map((classroom, index) => ({
			classroom: classroom.id,
			noticeKey: envelopes[index]
		}))
	};
}

/** A family's answer to a notice's poll, encrypted with its Family Key: only that family and staff open it. */
export function sealVote(notice: string, option: string, familyKey: CryptoKey) {
	return encryptData({ option }, familyKey, { purpose: 'poll-vote', notice });
}

/**
 * The answers to a notice's poll that open with their family's key and choose one of the poll's options.
 * Anyone holding a family's key could have written one, and an option can be taken off the poll, so the
 * others are left out.
 */
async function openVotes(
	notice: string,
	records: VoteRecord[],
	poll: Poll,
	familyKeys: FamilyKeys
) {
	const votes = await Promise.all(
		records.map(async ({ family, choice }): Promise<Vote | undefined> => {
			try {
				const key = await familyKeys(family);
				if (!key) return undefined;
				const data = await decryptData(choice, key, { purpose: 'poll-vote', notice });
				const { option } = fields(data);
				return poll.options.some(({ id }) => id === option)
					? { family, option: option as string }
					: undefined;
			} catch (cause) {
				if (cause instanceof UnreadableError) return undefined;
				throw cause;
			}
		})
	);
	return votes.filter((vote) => vote !== undefined);
}

/**
 * Opens a notice with the Group Key of any of its classrooms this device holds, and its poll's answers with
 * the Family Keys it holds. A device without Family Keys reads no answers.
 */
export async function openNotice(
	record: NoticeRecord,
	groupKeys: ReadonlyMap<string, CryptoKey>,
	familyKeys: FamilyKeys = async () => undefined
): Promise<Notice> {
	const { content, classrooms, votes, ...details } = record;
	const opened = classrooms.filter(({ classroom }) => groupKeys.has(classroom));
	const [first] = opened;
	if (!first) fail();
	const key = await unwrapKey(
		first.noticeKey,
		wrapping.noticeKeyForClassroom(groupKeys.get(first.classroom)!, first.classroom, record.id)
	);
	const data = readContent(
		await decryptData(content, key, { purpose: 'notice-content', notice: record.id })
	);
	return {
		...details,
		...data,
		classrooms: opened.map(({ classroom }) => classroom),
		votes: data.poll ? await openVotes(record.id, votes, data.poll, familyKeys) : []
	};
}

/**
 * Opens the board in the order the server sends it. A notice that doesn't open is left out and counted,
 * so one bad record doesn't hide the rest.
 */
export async function openBoard(
	records: NoticeRecord[],
	groupKeys: ReadonlyMap<string, CryptoKey>,
	familyKeys: FamilyKeys = async () => undefined
) {
	// A family that answered several polls has its key opened once.
	const opening = new Map<string, Promise<CryptoKey | undefined>>();
	const familyKey = (family: string) => {
		if (!opening.has(family)) opening.set(family, familyKeys(family));
		return opening.get(family)!;
	};
	const results = await Promise.allSettled(
		records.map((record) => openNotice(record, groupKeys, familyKey))
	);
	const notices: Notice[] = [];
	for (const result of results) {
		if (result.status === 'fulfilled') notices.push(result.value);
		else if (!(result.reason instanceof UnreadableError)) throw result.reason;
	}
	return { notices, unreadable: records.length - notices.length };
}
