import type { PhotoRecord } from '$lib/api';
import { decryptBytes, decryptData, encryptBytes, encryptData, UnreadableError } from '$lib/crypto';
import { CodedError } from '$lib/errors';

// Photos of a classroom's board (docs/access-format.md): a teacher photographs the corkboard, and the browser
// makes the photo smaller and encrypts it with the classroom's Group Key before it's uploaded, with its details,
// who put it up, encrypted on their own. Devices that see the classroom fetch it and decrypt it to show it. The
// server keeps its bytes in private R2.

/** The most a board photo takes once made smaller, which the server also holds it to. */
export const maxPhotoBytes = 3 * 1024 * 1024;

/** Who put a board photo up. The recovery card puts photos up without a name, as it posts notices. */
export type PhotoDetails = { author?: string };

/** A board photo as a device shows it, with who put it up, when its details opened. */
export type Photo = PhotoRecord & PhotoDetails;

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
 * A photo or picture made ready for the board: smaller, and encoded again as WebP, which keeps see-through
 * pixels. Where the browser can't write WebP, such as Safari, it's JPEG, or PNG when it has see-through pixels,
 * which JPEG would fill with black. Encoding it again also leaves out what the camera recorded with it, such as
 * where it was taken. A file that isn't an image this browser can read can't be used.
 */
export async function preparePhoto(photo: Blob) {
	const image = await openImage(photo).catch((cause) => {
		throw new CodedError('unusable-photo', { cause });
	});
	const webp = await writesWebp();
	let type: string | undefined;
	for (const { side, quality } of sizes) {
		const context = drawSmaller(image, side);
		if (!context) break;
		type ??= webp ? 'image/webp' : seeThrough(context) ? 'image/png' : 'image/jpeg';
		const encoded = await context.canvas.convertToBlob({ type, quality });
		if (encoded.size <= maxPhotoBytes) return encoded;
	}
	throw new CodedError('unusable-photo');
}

/**
 * A photo or picture, opened to be drawn smaller. It's never made into a full-size bitmap, as
 * `createImageBitmap` would make it: Safari on iPhone can't make one as large as the photos its own camera
 * takes, and refuses them. A file that isn't an image this browser can read is refused too.
 */
export async function openImage(photo: Blob) {
	const url = URL.createObjectURL(photo);
	const image = new Image();
	image.src = url;
	try {
		await image.decode();
		return image;
	} finally {
		// The image keeps what it loaded.
		URL.revokeObjectURL(url);
	}
}

/** An image drawn smaller on a canvas, its longer side at most `side` pixels, where the browser can draw. */
export function drawSmaller(image: HTMLImageElement, side: number) {
	const { naturalWidth: width, naturalHeight: height } = image;
	const scale = Math.min(1, side / Math.max(width, height));
	const canvas = new OffscreenCanvas(Math.round(width * scale), Math.round(height * scale));
	const context = canvas.getContext('2d');
	context?.drawImage(image, 0, 0, canvas.width, canvas.height);
	return context ?? undefined;
}

/**
 * Whether the browser writes WebP. Safari writes PNG when asked for it, so a single pixel tells, and no photo
 * is encoded twice.
 */
async function writesWebp() {
	const canvas = new OffscreenCanvas(1, 1);
	canvas.getContext('2d');
	const { type } = await canvas.convertToBlob({ type: 'image/webp' });
	return type === 'image/webp';
}

/** Whether any pixel drawn on a canvas is see-through. */
function seeThrough(context: OffscreenCanvasRenderingContext2D) {
	const { data } = context.getImageData(0, 0, context.canvas.width, context.canvas.height);
	for (let alpha = 3; alpha < data.length; alpha += 4) {
		if (data[alpha] < 255) return true;
	}
	return false;
}

/**
 * A picture as a device saves it: JPEG and PNG as they are, and WebP, which not every iPhone opens once saved,
 * encoded again as PNG, which keeps its see-through pixels.
 */
export async function pictureToSave(picture: Blob) {
	if (picture.type !== 'image/webp') return picture;
	const image = await createImageBitmap(picture);
	try {
		const canvas = new OffscreenCanvas(image.width, image.height);
		const context = canvas.getContext('2d');
		if (!context) throw new Error('This browser can’t draw pictures');
		context.drawImage(image, 0, 0);
		return await canvas.convertToBlob({ type: 'image/png' });
	} finally {
		image.close();
	}
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
 * written it, so only JPEG, PNG, and WebP images open.
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

/** The type of a JPEG, PNG, or WebP image, from the bytes it starts with. */
export function imageType(photo: Uint8Array) {
	const text = (start: number, end: number) => String.fromCharCode(...photo.subarray(start, end));
	if (photo[0] === 0xff && photo[1] === 0xd8 && photo[2] === 0xff) return 'image/jpeg';
	if (text(0, 8) === '\x89PNG\r\n\x1a\n') return 'image/png';
	if (text(0, 4) === 'RIFF' && text(8, 12) === 'WEBP') return 'image/webp';
	return undefined;
}

/** Encrypts a board photo's details with the classroom's Group Key, for the server to keep beside the photo. */
export function sealPhotoDetails(
	details: PhotoDetails,
	groupKey: CryptoKey,
	classroom: string,
	id: string
) {
	return encryptData(details, groupKey, { purpose: 'board-photo-details', classroom, photo: id });
}

/** A board photo's details, decrypted. Anyone holding the classroom's Group Key could have written them. */
export async function openPhotoDetails(
	sealed: string,
	groupKey: CryptoKey,
	classroom: string,
	id: string
): Promise<PhotoDetails> {
	const details = await decryptData(sealed, groupKey, {
		purpose: 'board-photo-details',
		classroom,
		photo: id
	});
	if (typeof details !== 'object' || details === null || Array.isArray(details)) {
		throw new UnreadableError();
	}
	const { author } = details as Record<string, unknown>;
	if (author === undefined) return {};
	if (typeof author !== 'string' || !author) throw new UnreadableError();
	return { author };
}
