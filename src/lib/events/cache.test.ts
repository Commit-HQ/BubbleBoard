import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cachePicture, cachedPicture, clearCachedPictures, keepCachedPictures } from './cache';

const photo = (text: string) => new Blob([text], { type: 'image/jpeg' });

afterEach(async () => {
	vi.unstubAllGlobals();
	await clearCachedPictures();
});

describe('event photos kept on the device', () => {
	it('has nothing before anything is kept', async () => {
		expect(await cachedPicture('/api/events/e/files/p', 'card')).toBeUndefined();
	});

	it('gives back what this card kept', async () => {
		await cachePicture('/api/events/e/files/p', 'card', { blob: photo('composed'), mine: true });
		const kept = await cachedPicture('/api/events/e/files/p', 'card');
		expect(kept?.mine).toBe(true);
		expect(await kept?.blob.text()).toBe('composed');
	});

	it('never shows another card’s copy, and lets go of it', async () => {
		await cachePicture('/api/events/e/files/p', 'card', { blob: photo('composed'), mine: false });
		expect(await cachedPicture('/api/events/e/files/p', 'other')).toBeUndefined();
		expect(await cachedPicture('/api/events/e/files/p', 'card')).toBeUndefined();
	});

	it('keeps only the photos of events still up', async () => {
		for (const path of ['a', 'b', 'c'])
			await cachePicture(path, 'card', { blob: photo(path), mine: false });
		await keepCachedPictures(['a', 'c', 'not kept']);
		expect(await cachedPicture('a', 'card')).toBeDefined();
		expect(await cachedPicture('b', 'card')).toBeUndefined();
		expect(await cachedPicture('c', 'card')).toBeDefined();
	});

	it('lets go of everything when the card goes', async () => {
		await cachePicture('a', 'card', { blob: photo('a'), mine: false });
		await cachePicture('b', 'card', { blob: photo('b'), mine: false });
		await clearCachedPictures();
		expect(await cachedPicture('a', 'card')).toBeUndefined();
		expect(await cachedPicture('b', 'card')).toBeUndefined();
	});

	it('goes on without keeping anything when the device can’t store', async () => {
		vi.stubGlobal('indexedDB', {
			open() {
				throw new Error('No storage');
			}
		});
		await expect(
			cachePicture('a', 'card', { blob: photo('a'), mine: false })
		).resolves.toBeUndefined();
		await expect(cachedPicture('a', 'card')).resolves.toBeUndefined();
		await expect(keepCachedPictures([])).resolves.toBeUndefined();
		await expect(clearCachedPictures()).resolves.toBeUndefined();
	});
});
