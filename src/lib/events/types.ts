import type { NoticeDocument } from '$lib/notices';
export type ConsentRow = {
	child: string;
	family: string;
	label: string;
	choice: string | null;
	revision: number;
};
export type ConsentSnapshot = { catalog: number; revision: number; rows: ConsentRow[] };
export type EventRecord = {
	id: string;
	classroom: string;
	teacher: string | null;
	content: string;
	eventKey: string;
	postedAt: number;
	expiresAt: number;
};
/** One photo of an event's gallery, with the few words a teacher may write under it. */
export type EventPhoto = { id: string; width: number; height: number; text?: string };
export type EventContent = {
	version: 1;
	title: string;
	date: string;
	/** The event's words, written and read like a notice's (src/lib/notices.ts). */
	description: NoticeDocument;
	photos: EventPhoto[];
};
/** The longest a photo's own words may be, in characters. */
export const maxEventPhotoText = 300;
export type OpenEvent = EventRecord & { value: EventContent; key: CryptoKey };
export const maxEventFileBytes = 32 * 1024 * 1024;
