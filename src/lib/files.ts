import {
	createContentKey,
	createId,
	decryptBytes,
	encryptBytes,
	openContentKey
} from '$lib/crypto';
import { CodedError } from '$lib/errors';
import { isAppleTouch } from '$lib/install';
import { imageBlob, pictureToSave, preparePhoto } from '$lib/photos';

// Files attached to notices (docs/access-format.md): documents and pictures a teacher adds to a notice. The
// browser encrypts each with a key of its own, which goes inside the notice's content with the file's name,
// so whoever opens the notice opens its files. The server keeps their encrypted bytes in private R2, can't
// open them, and deletes them with the notice. Boards show pictures, which devices save as JPEG or PNG, and
// devices save documents as they are.

/** The most a file may take, which the server also holds it to. */
export const maxFileBytes = 10 * 1024 * 1024;
/** The most files a notice may carry. */
export const maxNoticeFiles = 10;
const maxNameLength = 120;

/**
 * The documents a notice can carry, by extension, with the type a device saves each as. Nothing a browser
 * would open as a page, such as HTML or SVG, is among them, since a file opens with the app's own origin.
 */
const documentTypes = new Map([
	['pdf', 'application/pdf'],
	['doc', 'application/msword'],
	['docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
	['xls', 'application/vnd.ms-excel'],
	['xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
	['ppt', 'application/vnd.ms-powerpoint'],
	['pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
	['odt', 'application/vnd.oasis.opendocument.text'],
	['ods', 'application/vnd.oasis.opendocument.spreadsheet'],
	['odp', 'application/vnd.oasis.opendocument.presentation'],
	['txt', 'text/plain']
]);
/** Pictures a teacher may pick, which are attached as WebP, JPEG, or PNG once made ready. */
const pictureExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif', 'avif'];
/** The types pictures are attached and saved as, by extension. */
const pictureTypes = new Map([
	['jpg', 'image/jpeg'],
	['png', 'image/png'],
	['webp', 'image/webp']
]);

/** What the file picker offers. */
export const fileAccept = [...documentTypes.keys(), ...pictureExtensions]
	.map((extension) => `.${extension}`)
	.join(',');

/** A file as its notice's content holds it: its name, its size in bytes, and the key its bytes open with. */
export type NoticeFile = { id: string; name: string; bytes: number; key: string };
/**
 * A file attached in a notice's form, sealed as it was attached, so every try at saving the notice uploads
 * the same bytes, which open with the key the notice holds.
 */
export type NewFile = NoticeFile & { sealed: Uint8Array<ArrayBuffer> };

/** Whether a character has no place in a file's name: a control character, or a slash, which makes a path. */
function unsafe(character: string) {
	const code = character.charCodeAt(0);
	return code < 32 || code === 127 || character === '/' || character === '\\';
}

function extensionOf(name: string) {
	const dot = name.lastIndexOf('.');
	return dot > 0 ? name.slice(dot + 1).toLowerCase() : '';
}

/** The type a file with this name is saved as, when notices carry its kind. */
function typeOf(name: string) {
	const extension = extensionOf(name);
	return documentTypes.get(extension) ?? pictureTypes.get(extension);
}

/** Whether a notice's file is a picture, which boards show, rather than a document to save. */
export function isPicture(file: Pick<NoticeFile, 'name'>) {
	return pictureTypes.has(extensionOf(file.name));
}

/** The extension a picture is named with, from the type it's encoded as. */
function pictureExtension(type: string) {
	return [...pictureTypes].find(([, known]) => known === type)?.[0] ?? 'jpg';
}

/** Whether a notice's content may name a file so: a short name of a kind notices carry, without paths. */
export function isFileName(value: unknown): value is string {
	return (
		typeof value === 'string' &&
		value.length <= maxNameLength &&
		![...value].some(unsafe) &&
		typeOf(value) !== undefined
	);
}

/** A file's name, no longer than a notice's content allows, with this extension. */
function nameWith(name: string, extension: string) {
	const dot = name.lastIndexOf('.');
	const base = [...(dot > 0 ? name.slice(0, dot) : name)].filter((character) => !unsafe(character));
	const kept = base.join('').trim() || 'file';
	return `${kept.slice(0, maxNameLength - extension.length - 1)}.${extension}`;
}

/** Encrypts a file's bytes with a new key of its own, for its notice's content to hold. */
export async function sealFile(
	id: string,
	name: string,
	data: Uint8Array<ArrayBuffer>
): Promise<NewFile> {
	const { key, raw } = await createContentKey();
	const sealed = await encryptBytes(data, key, { purpose: 'notice-file', file: id });
	return { id, name, bytes: data.length, key: raw, sealed };
}

/**
 * Makes a file ready to attach and seals it: a document as it is, or a picture made smaller and encoded
 * again, as board photos are, which also leaves out what the camera recorded with it, such as where it was
 * taken. Only the sealed bytes are kept. A kind of file notices don't carry, or a document too large, is
 * refused.
 */
export async function prepareFile(file: File) {
	const extension = extensionOf(file.name);
	if (pictureExtensions.includes(extension)) {
		const picture = await preparePhoto(file);
		const name = nameWith(file.name, pictureExtension(picture.type));
		return sealFile(createId(), name, new Uint8Array(await picture.arrayBuffer()));
	}
	if (!documentTypes.has(extension)) throw new CodedError('file-type');
	if (file.size > maxFileBytes) throw new CodedError('file-too-large');
	const data = new Uint8Array(await file.arrayBuffer());
	return sealFile(createId(), nameWith(file.name, extension), data);
}

/** A notice's file's bytes, decrypted with the key its notice holds. */
async function decryptFile(sealed: Uint8Array<ArrayBuffer>, { id, key }: NoticeFile) {
	return decryptBytes(sealed, await openContentKey(key), { purpose: 'notice-file', file: id });
}

/**
 * A notice's file, decrypted, as the kind of file its name says. Its type follows its name, never its bytes,
 * so whatever it holds, it's saved as a document or picture and never opens as a page.
 */
export async function openFile(sealed: Uint8Array<ArrayBuffer>, file: NoticeFile) {
	return new Blob([await decryptFile(sealed, file)], { type: typeOf(file.name) });
}

/** One of a notice's pictures, decrypted, as an image a page can show, as board photos are (`imageBlob`). */
export async function openPicture(sealed: Uint8Array<ArrayBuffer>, file: NoticeFile) {
	return imageBlob(await decryptFile(sealed, file));
}

/** Saves a file on this device under its name, as a download. */
export function saveFile(file: Blob, name: string) {
	const url = URL.createObjectURL(file);
	const link = Object.assign(document.createElement('a'), { href: url, download: name });
	link.click();
	// Some browsers read the file a moment after the download starts.
	setTimeout(() => URL.revokeObjectURL(url), 60 * 1000);
}

/**
 * Saves a board photo or a notice's picture on this device under its name, as JPEG or PNG (`pictureToSave`).
 * On iPhone and iPad it goes to the share sheet, whose Save Image puts it in Photos, where people look for
 * pictures. Elsewhere, or where the share sheet can't open, it's a download.
 */
export async function savePicture(picture: Blob, name: string) {
	const saved = await pictureToSave(picture);
	const file = new File([saved], nameWith(name, pictureExtension(saved.type)), {
		type: saved.type
	});
	if (
		isAppleTouch(navigator.userAgent, navigator.maxTouchPoints) &&
		navigator.canShare?.({ files: [file] })
	) {
		try {
			return await navigator.share({ files: [file] });
		} catch (cause) {
			// Closing the share sheet saves nothing, as it should.
			if (cause instanceof DOMException && cause.name === 'AbortError') return;
		}
	}
	saveFile(file, file.name);
}
