import { describe, expect, it } from 'vitest';
import { createId, encryptData, SEALED_BYTES_OVERHEAD, UnreadableError } from './crypto';
import { imageType, openPhoto, openPhotoDetails, sealPhoto, sealPhotoDetails } from './photos';

// Photos of the board, sealed as a staff device puts one up and opened as the classroom's devices show it.
// A few bytes that start the way each format does stand in for a photo.

const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16, 74, 70, 73, 70]);
const webp = new TextEncoder().encode('RIFF\x00\x00\x00\x00WEBPVP8 ');

/** A classroom's Group Key, as a device holds one once it has opened it. */
function groupKey() {
	return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

/** The sealed bytes with one byte changed. */
function changed(sealed: Uint8Array<ArrayBuffer>, index: number, value = sealed.at(index)! ^ 1) {
	const copy = sealed.slice();
	copy[(index + copy.length) % copy.length] = value;
	return copy;
}

describe('board photos', () => {
	it('open only with their classroom’s key, for the classroom and photo they were put up for', async () => {
		const [bubbles, owls, id] = [createId(), createId(), createId()];
		const [key, otherKey] = [await groupKey(), await groupKey()];
		const sealed = await sealPhoto(jpeg, key, bubbles, id);
		expect(sealed).toHaveLength(jpeg.length + SEALED_BYTES_OVERHEAD);
		const opened = await openPhoto(sealed, key, bubbles, id);
		expect(opened.type).toBe('image/jpeg');
		expect(new Uint8Array(await opened.arrayBuffer())).toEqual(jpeg);

		for (const [refused, attempt] of [
			['another classroom’s key', () => openPhoto(sealed, otherKey, bubbles, id)],
			['another classroom', () => openPhoto(sealed, key, owls, id)],
			['another photo', () => openPhoto(sealed, key, bubbles, createId())],
			['a changed tag', () => openPhoto(changed(sealed, -1), key, bubbles, id)],
			['a changed IV', () => openPhoto(changed(sealed, 1), key, bubbles, id)],
			['another format', () => openPhoto(changed(sealed, 0, 2), key, bubbles, id)],
			[
				'too few bytes',
				() => openPhoto(sealed.slice(0, SEALED_BYTES_OVERHEAD - 1), key, bubbles, id)
			]
		] as const) {
			await expect(attempt(), refused).rejects.toThrow(UnreadableError);
		}
	});

	it('show only JPEG and WebP images', async () => {
		expect(imageType(jpeg)).toBe('image/jpeg');
		expect(imageType(webp)).toBe('image/webp');
		const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"/>');
		expect(imageType(svg)).toBeUndefined();
		const [classroom, id, key] = [createId(), createId(), await groupKey()];
		const sealed = await sealPhoto(svg, key, classroom, id);
		await expect(openPhoto(sealed, key, classroom, id)).rejects.toThrow(UnreadableError);
	});

	it('say who put them up, in details that open only with their classroom’s key, for their own photo', async () => {
		const [bubbles, owls, id] = [createId(), createId(), createId()];
		const [key, otherKey] = [await groupKey(), await groupKey()];
		const sealed = await sealPhotoDetails({ author: 'Ana Horvat' }, key, bubbles, id);
		expect(await openPhotoDetails(sealed, key, bubbles, id)).toEqual({ author: 'Ana Horvat' });
		// The recovery card puts photos up without a name.
		const unnamed = await sealPhotoDetails({}, key, bubbles, id);
		expect(await openPhotoDetails(unnamed, key, bubbles, id)).toEqual({});

		const context = { purpose: 'board-photo-details', classroom: bubbles, photo: id } as const;
		const numbered = await encryptData({ author: 7 }, key, context);
		for (const [refused, attempt] of [
			['another classroom’s key', () => openPhotoDetails(sealed, otherKey, bubbles, id)],
			['another classroom', () => openPhotoDetails(sealed, key, owls, id)],
			['another photo', () => openPhotoDetails(sealed, key, bubbles, createId())],
			['an author that isn’t a name', () => openPhotoDetails(numbered, key, bubbles, id)]
		] as const) {
			await expect(attempt(), refused).rejects.toThrow(UnreadableError);
		}
	});
});
