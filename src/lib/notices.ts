import type { NoticeRecord } from '$lib/api';
import {
	createKey,
	decryptData,
	encryptData,
	UnreadableError,
	unwrapKey,
	type Wrapping
} from '$lib/crypto';

// Notices on the board, as devices write and read them (docs/access-format.md). Every save seals a notice
// under a new Notice Key, wrapped with the Group Key of each of its classrooms, so a classroom taken off a
// notice can't open its later versions. The server stores envelopes and decides who may post and read.

/** How long a notice stays up, in days from when it was first posted. The server accepts only these. */
export const noticeDays = [1, 3, 7, 14, 30, 60, 90] as const;
export const defaultNoticeDays = 30;

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

/** What a notice holds inside its envelope. A notice posted with the recovery card has no author. */
export type NoticeContent = { author?: string; paper: Paper; body: NoticeDocument };

/** A notice as a device shows it, with those of its classrooms the device belongs to. */
export type Notice = Omit<NoticeRecord, 'content' | 'classrooms'> &
	NoticeContent & { classrooms: string[] };

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

/** Links a notice may hold: web pages over https, and email addresses. */
function readHref(value: unknown) {
	if (typeof value !== 'string' || value.length > maxLinkLength || !URL.canParse(value)) fail();
	const { protocol } = new URL(value);
	return protocol === 'https:' || protocol === 'mailto:' ? value : fail();
}

function readContent(value: unknown): NoticeContent {
	const { author, paper, body } = fields(value);
	if (author !== undefined && (typeof author !== 'string' || !author)) fail();
	if (!papers.includes(paper as Paper)) fail();
	const content = { paper: paper as Paper, body: readDocument(body) };
	return author === undefined ? content : { author: author as string, ...content };
}

/** A document of plain paragraphs, one for each line of `text`. */
export function textDocument(text: string): NoticeDocument {
	return {
		type: 'doc',
		content: text
			.split('\n')
			.map((line) =>
				line
					? { type: 'paragraph', content: [{ type: 'text', text: line }] }
					: { type: 'paragraph' }
			)
	};
}

/** A document's text, a line for each paragraph and list item. */
export function documentText(document: NoticeDocument) {
	const inline = (content: NoticeInline[] = []) =>
		content.map((node) => (node.type === 'text' ? node.text : '\n')).join('');
	const block = (node: NoticeBlock): string[] =>
		node.type === 'paragraph'
			? [inline(node.content)]
			: node.content.flatMap((item) => item.content.flatMap(block));
	return document.content.flatMap(block).join('\n');
}

function noticeKeyFor(groupKey: CryptoKey, classroom: string, notice: string): Wrapping {
	return { key: groupKey, context: { purpose: 'notice-key-for-classroom', classroom, notice } };
}

/** Seals a notice, as a device posts or changes it, under a new Notice Key for each of its classrooms. */
export async function sealNotice(
	id: string,
	content: NoticeContent,
	classrooms: { id: string; groupKey: CryptoKey }[]
) {
	const { key, envelopes } = await createKey(
		classrooms.map((classroom) => noticeKeyFor(classroom.groupKey, classroom.id, id))
	);
	return {
		content: await encryptData(content, key, { purpose: 'notice-content', notice: id }),
		classrooms: classrooms.map((classroom, index) => ({
			classroom: classroom.id,
			noticeKey: envelopes[index]
		}))
	};
}

/** Opens a notice with the Group Key of any of its classrooms this device holds. */
export async function openNotice(
	record: NoticeRecord,
	groupKeys: ReadonlyMap<string, CryptoKey>
): Promise<Notice> {
	const { content, classrooms, ...details } = record;
	const opened = classrooms.filter(({ classroom }) => groupKeys.has(classroom));
	const [first] = opened;
	if (!first) fail();
	const key = await unwrapKey(
		first.noticeKey,
		noticeKeyFor(groupKeys.get(first.classroom)!, first.classroom, record.id)
	);
	const data = await decryptData(content, key, { purpose: 'notice-content', notice: record.id });
	return {
		...details,
		...readContent(data),
		classrooms: opened.map(({ classroom }) => classroom)
	};
}

/**
 * Opens the board in the order the server sends it. A notice that doesn't open is left out and counted,
 * so one bad record doesn't hide the rest.
 */
export async function openBoard(
	records: NoticeRecord[],
	groupKeys: ReadonlyMap<string, CryptoKey>
) {
	const results = await Promise.allSettled(records.map((record) => openNotice(record, groupKeys)));
	const notices: Notice[] = [];
	for (const result of results) {
		if (result.status === 'fulfilled') notices.push(result.value);
		else if (!(result.reason instanceof UnreadableError)) throw result.reason;
	}
	return { notices, unreadable: records.length - notices.length };
}
