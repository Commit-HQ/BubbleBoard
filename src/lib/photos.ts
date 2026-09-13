import { decryptBytes, encryptBytes, UnreadableError } from '$lib/crypto';
import { CodedError } from '$lib/errors';

// Photos of a classroom's board (docs/access-format.md): a teacher photographs the corkboard, and the browser
// makes the photo smaller and encrypts it with the classroom's Group Key before it's uploaded. Devices that
// see the classroom fetch it and decrypt it to show it. The server keeps its bytes in private R2.

/** The most a board photo takes once made smaller, which the server also holds it to. */
export const maxPhotoBytes = 3 * 1024 * 1024;

/**
 * The sizes a photo is made at, largest first, until one fits: its longer side in pixels, and the encoding's
 * quality. The largest keeps the notices pinned on the board readable when the photo is zoomed in.
 */
const sizes = [
	{ side: 2560, quality: 0.85 },
	{ side: 1920, quality: 0.8 },
	{ side: 1280, quality: 0.75 }
];

/**
 * A photo made ready for the board: smaller, and encoded again as WebP, or as JPEG where the browser can't
 * write WebP. Encoding it again also leaves out what the camera recorded with it, such as where it was taken.
 * A file that isn't an image this browser can read can't be used.
 */
export async function preparePhoto(photo: Blob) {
	const image = await createImageBitmap(photo).catch((cause) => {
		throw new CodedError('unusable-photo', { cause });
	});
	try {
		const type = await encodedType();
		for (const { side, quality } of sizes) {
			const scale = Math.min(1, side / Math.max(image.width, image.height));
			const canvas = new OffscreenCanvas(
				Math.round(image.width * scale),
				Math.round(image.height * scale)
			);
			const context = canvas.getContext('2d');
			if (!context) break;
			context.drawImage(image, 0, 0, canvas.width, canvas.height);
			const encoded = await canvas.convertToBlob({ type, quality });
			if (encoded.size <= maxPhotoBytes) return encoded;
		}
		throw new CodedError('unusable-photo');
	} finally {
		image.close();
	}
}

/**
 * The type photos are encoded as: WebP, or JPEG where the browser can't write WebP, such as Safari, which
 * writes PNG instead. A single pixel tells, so no photo is encoded twice.
 */
async function encodedType() {
	const canvas = new OffscreenCanvas(1, 1);
	canvas.getContext('2d');
	const { type } = await canvas.convertToBlob({ type: 'image/webp' });
	return type === 'image/webp' ? type : 'image/jpeg';
}

/** Encrypts a photo made ready for a classroom's board, with the classroom's Group Key. */
export function sealPhoto(
	photo: Uint8Array<ArrayBuffer>,
	groupKey: CryptoKey,
	classroom: string,
	id: string
) {
	return encryptBytes(photo, groupKey, { purpose: 'board-photo', classroom, photo: id });
}

/**
 * A board photo, decrypted, as an image a page can show. Anyone holding the classroom's Group Key could have
 * written it, so only JPEG and WebP images open.
 */
export async function openPhoto(
	sealed: Uint8Array<ArrayBuffer>,
	groupKey: CryptoKey,
	classroom: string,
	id: string
) {
	const photo = await decryptBytes(sealed, groupKey, {
		purpose: 'board-photo',
		classroom,
		photo: id
	});
	const type = imageType(photo);
	if (!type) throw new UnreadableError();
	return new Blob([photo], { type });
}

/** The type of a JPEG or WebP image, from the bytes it starts with. */
export function imageType(photo: Uint8Array) {
	const text = (start: number, end: number) => String.fromCharCode(...photo.subarray(start, end));
	if (photo[0] === 0xff && photo[1] === 0xd8 && photo[2] === 0xff) return 'image/jpeg';
	if (text(0, 4) === 'RIFF' && text(8, 12) === 'WEBP') return 'image/webp';
	return undefined;
}
