import { objectStore } from '$lib/indexeddb';
import type { Edit, History } from './editor';
import type { NoticeDocument } from '$lib/notices';

// The unfinished event on this device, so that a phone call, or a tab the phone puts away, doesn't throw
// away half an hour of covering faces. One draft per device: the last one the teacher was working on.
//
// It isn't encrypted, on purpose. These photos are already in the teacher's camera roll, and a key kept
// beside the data in the same IndexedDB would protect nothing. What protects the draft is how long it stays:
// it belongs to the card this device is connected with, and it goes when the event is published, when the
// teacher starts over, when the device disconnects, and once it's a week old.
//
// Two databases with one store each, as src/lib/device.ts keeps its card: the prepared photos are about a
// megabyte each and are written once, so writing an edit never rewrites them.

/** How long an unfinished event waits on the device before it's thrown away. */
export const draftLife = 7 * 24 * 60 * 60 * 1000;

export type DraftPhoto = {
	id: string;
	width: number;
	height: number;
	text: string;
	detection: 'pending' | 'ready' | 'failed' | 'manual';
	/** What the teacher has marked now. The undo stack isn't worth keeping, and object URLs can't be. */
	edit: Edit;
};

export type SavedDraft = {
	credential: string;
	savedAt: number;
	classroom: string;
	title: string;
	date: string;
	days: number;
	description: NoticeDocument;
	step: 'details' | 'photos';
	photos: DraftPhoto[];
};

type Details = {
	classroom: string;
	title: string;
	date: string;
	days: number;
	description: NoticeDocument;
	step: 'details' | 'photos' | 'review';
};
type Source = Omit<DraftPhoto, 'edit'> & { history: History };

/**
 * What a draft is made of: the event itself and, for each photo, the marks on it now. The packaged photos of
 * the review step aren't kept, so a teacher who was reviewing comes back to the photos.
 */
export function savedDraft(
	credential: string,
	details: Details,
	photos: Source[],
	now = Date.now()
): SavedDraft {
	return {
		...details,
		credential,
		savedAt: now,
		step: details.step === 'review' ? 'photos' : details.step,
		photos: photos.map(({ id, width, height, text, detection, history }) => ({
			id,
			width,
			height,
			text,
			detection,
			edit: history.present
		}))
	};
}

/** A draft this device may open again. Another card's, or one gone stale, is thrown away instead. */
export function openable(saved: unknown, credential: string, now = Date.now()) {
	const draft = saved as SavedDraft | undefined;
	return draft?.credential === credential &&
		now - draft.savedAt < draftLife &&
		Array.isArray(draft.photos) &&
		draft.photos.length > 0
		? draft
		: undefined;
}

const record = objectStore('bubbleboard-event-draft', 'draft');
const photos = objectStore('bubbleboard-event-photos', 'photos');

/** Keeping the draft is best effort: a device with no room left goes on editing, it just doesn't keep it. */
async function tried(work: Promise<unknown>) {
	try {
		await work;
		return true;
	} catch {
		return false;
	}
}

export function saveDraft(draft: SavedDraft) {
	return tried(record('readwrite', (store) => void store.put(draft, 'draft')));
}

export function saveDraftPhoto(id: string, blob: Blob) {
	return tried(photos('readwrite', (store) => void store.put(blob, id)));
}

export function forgetDraftPhoto(id: string) {
	return tried(photos('readwrite', (store) => void store.delete(id)));
}

export async function draftPhoto(id: string) {
	try {
		return await photos('readonly', (store) => store.get(id) as IDBRequest<Blob | undefined>);
	} catch {
		return undefined;
	}
}

/** The draft this card left here, if there is one. Anything else, another card's included, goes. */
export async function loadDraft(credential: string) {
	let draft: SavedDraft | undefined;
	try {
		draft = openable(await record('readonly', (store) => store.get('draft')), credential);
	} catch {
		return undefined;
	}
	if (!draft) await clearDraft();
	return draft;
}

export async function clearDraft() {
	await Promise.all([
		tried(record('readwrite', (store) => void store.clear())),
		tried(photos('readwrite', (store) => void store.clear()))
	]);
}
