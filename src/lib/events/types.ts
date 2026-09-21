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
	/**
	 * Who published it. It travels inside the manifest, as a notice's author does, because families cannot
	 * read the staff catalog. Events published before it, and the recovery card's, have none.
	 */
	author?: string;
};
/** The longest a photo's own words may be, in characters. */
export const maxEventPhotoText = 300;
export type OpenEvent = EventRecord & { value: EventContent; key: CryptoKey };
/**
 * The most photos any installation may allow in one event, which the reader of a published event holds to:
 * what an installation actually allows is its own setting (src/lib/events/limits.ts), and lowering that must
 * not make the events it has already published unreadable.
 */
export const mostEventPhotos = 60;
/** The most an event's manifest may take, in bytes, measured as the server measures it. */
export const maxEventContentBytes = 32000;
export const maxEventFileBytes = 32 * 1024 * 1024;
/**
 * The longest side the editor works at, and the ceiling a reader holds a published photo to. The writer's
 * working size must stay at or under the reader's ceiling or a published gallery stops opening.
 */
export const editorSide = 1920;
/** The most face patches one photo may carry, held to by both the writer and the reader. */
export const maxPatches = 400;
/** The most families one patch may be granted to, matching the family cap in src/lib/server/validate.ts. */
export const maxGrants = 20;
