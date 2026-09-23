import { objectStore } from '$lib/indexeddb';

// Event photos this device has already composed, so that a gallery opened again shows at once instead of
// downloading, decrypting and putting every photo together again (package.ts). Only event photos are kept:
// they are the one picture that costs a moment of work each, and a family comes back to them.
//
// It isn't encrypted, on purpose, for the reason the event draft isn't (draft.ts): the card's own keys sit
// unencrypted in the same IndexedDB, so a key kept beside these photos would protect nothing. What protects
// them is how long they stay. Every time the board's events load, whatever isn't a photo of an event still up
// goes, so a removed or expired event, or a photo taken off in a change, leaves the device with the next load;
// and everything goes when the device disconnects.
//
// A photo is kept by where its sealed bytes are fetched from. A published photo is never sealed again
// (docs/events-format.md): a change adds photos under new IDs and takes old ones off, so the bytes at a path
// never change and the path is all a copy needs to be found by. What is composed from them does differ from one
// card to another, which faces show and whether this family's child is in it, so each copy names the card it
// was composed for, and another card's copy is never shown.

export type CachedPicture = { blob: Blob; mine: boolean };

type Entry = CachedPicture & { path: string; credential: string; storedAt: number };

const pictures = objectStore('bubbleboard-event-cache', 'pictures', { keyPath: 'path' });

/**
 * Keeping photos is best effort, as keeping the draft is: a device with no room left, or a private window,
 * goes on showing photos, it just composes them again.
 */
async function tried(work: Promise<unknown>) {
	try {
		await work;
	} catch {
		// Nothing kept; nothing lost but time.
	}
}

/** The photo this card composed before, if this device kept it. Another card's copy goes instead. */
export async function cachedPicture(
	path: string,
	credential: string
): Promise<CachedPicture | undefined> {
	let entry: Entry | undefined;
	try {
		entry = await pictures('readonly', (store) => store.get(path) as IDBRequest<Entry | undefined>);
	} catch {
		return undefined;
	}
	if (!entry) return undefined;
	if (entry.credential !== credential || !(entry.blob instanceof Blob)) {
		await tried(pictures('readwrite', (store) => void store.delete(path)));
		return undefined;
	}
	return { blob: entry.blob, mine: entry.mine === true };
}

export function cachePicture(path: string, credential: string, { blob, mine }: CachedPicture) {
	const entry: Entry = { path, credential, blob, mine, storedAt: Date.now() };
	return tried(pictures('readwrite', (store) => void store.put(entry)));
}

/** Lets go of every kept photo that isn't one of these, reading only the keys. */
export function keepCachedPictures(paths: Iterable<string>) {
	const keep = new Set(paths);
	return tried(
		pictures('readwrite', (store) => {
			const listing = store.getAllKeys();
			listing.onsuccess = () => {
				for (const path of listing.result)
					if (typeof path !== 'string' || !keep.has(path)) store.delete(path);
			};
		})
	);
}

export function clearCachedPictures() {
	return tried(pictures('readwrite', (store) => void store.clear()));
}
