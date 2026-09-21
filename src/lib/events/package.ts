import { overlapAreas, overlapPixels, overlapAudience } from './overlaps';
import { fromBase64Url, toBase64Url } from '$lib/base64url';
import {
	createContentKey,
	createId,
	decryptBytes,
	decryptData,
	encryptBytes,
	encryptData,
	fields,
	isContentKey,
	isId,
	openContentKey,
	UnreadableError
} from '$lib/crypto';
import type { Region, Rect } from './editor';
import {
	editorSide,
	maxEventPhotoText,
	maxGrants,
	maxPatches,
	mostEventPhotos,
	type ConsentRow,
	type EventPhoto,
	type EventRecord,
	type OpenEvent
} from './types';
import { readDocument, type NoticeDocument } from '$lib/notices';
import { writesWebp } from '$lib/photos';
import { safePreview } from './images';

const bytes = async (blob: Blob) => new Uint8Array(await blob.arrayBuffer());
const context = (event: string, photo: string, part?: string) => ({ event, photo, part });
export type ChildPolicy = { id: string; families: string[] };
/**
 * The authenticated context of what a family records about one child: it ties the envelope to that child and
 * that family card, so neither can be moved to another. Every reader and writer of consent builds it here.
 */
const choiceContext = (child: string, family: string) => ({ event: child, part: family });

/** A family's choice for one child. Missing, malformed or unreadable consent is always private. */
export async function readChoice(
	row: Pick<ConsentRow, 'child' | 'family' | 'choice'>,
	key: CryptoKey
) {
	if (!row.choice) return false;
	try {
		return (
			fields(
				await decryptData(row.choice, key, {
					purpose: 'photo-choice',
					...choiceContext(row.child, row.family)
				})
			).share === true
		);
	} catch {
		return false;
	}
}

/** Seals a family's choice for one child, so only that family and staff read it. */
export const sealChoice = (share: boolean, key: CryptoKey, child: string, family: string) =>
	encryptData({ share }, key, { purpose: 'photo-choice', ...choiceContext(child, family) });

/** What a classroom calls a child, as staff sealed it for the family. Unreadable labels have no name. */
export async function readLabel(
	row: Pick<ConsentRow, 'child' | 'family' | 'label'>,
	key: CryptoKey
) {
	try {
		const label = fields(
			await decryptData(row.label, key, {
				purpose: 'photo-label',
				...choiceContext(row.child, row.family)
			})
		);
		return typeof label.name === 'string' ? label.name : undefined;
	} catch {
		return undefined;
	}
}

/** Missing, malformed or unreadable consent is always private. Ignore IDs outside the actual catalog. */
export async function sharing(
	children: ChildPolicy[],
	rows: ConsentRow[],
	key: (family: string) => Promise<CryptoKey>
) {
	const result = new Set<string>();
	for (const child of children) {
		if (!child.families.length) continue;
		const choices = await Promise.all(
			child.families.map(async (family) => {
				const row = rows.find((r) => r.child === child.id && r.family === family);
				return row ? await readChoice(row, await key(family)) : false;
			})
		);
		if (choices.every(Boolean)) result.add(child.id);
	}
	return result;
}

/** Crop only this face. Overlaps have zero in every channel, including invisible RGB. */
export function facePixels(source: Uint8ClampedArray, width: number, region: Rect, others: Rect[]) {
	const output = new Uint8ClampedArray(region.width * region.height * 4);
	// Only a rect that actually meets this one can blank a pixel; in a gallery of separate faces, none does.
	const meeting = others.filter(
		(r) =>
			r.x < region.x + region.width &&
			r.x + r.width > region.x &&
			r.y < region.y + region.height &&
			r.y + r.height > region.y
	);
	for (let y = 0; y < region.height; y++) {
		const py = region.y + y;
		const crossing = meeting.filter((r) => py >= r.y && py < r.y + r.height);
		const from = (py * width + region.x) * 4,
			to = y * region.width * 4;
		if (!crossing.length) {
			output.set(source.subarray(from, from + region.width * 4), to);
			continue;
		}
		for (let x = 0; x < region.width; x++) {
			const px = region.x + x;
			if (crossing.some((r) => px >= r.x && px < r.x + r.width)) continue;
			const at = (py * width + px) * 4,
				out = to + x * 4;
			output[out] = source[at];
			output[out + 1] = source[at + 1];
			output[out + 2] = source[at + 2];
			output[out + 3] = source[at + 3];
		}
	}
	return output;
}
type Patch = {
	id: string;
	x: number;
	y: number;
	width: number;
	height: number;
	data: string;
	shared?: string;
	grants: string[];
};
type Package = {
	version: 1;
	width: number;
	height: number;
	base: string;
	/** How the safe raster is encoded, which carries no faces and so needn't be lossless. */
	type: (typeof baseTypes)[number];
	patches: Patch[];
	staff: string;
};
const baseTypes = ['image/webp', 'image/jpeg', 'image/png'] as const;
export type PreparedPhoto = {
	id: string;
	width: number;
	height: number;
	sealed: Uint8Array<ArrayBuffer>;
};

export async function preparePackage(
	event: string,
	id: string,
	blob: Blob,
	regions: Region[],
	key: CryptoKey,
	staffKey: CryptoKey,
	children: ChildPolicy[],
	shared: Set<string>,
	familyKey: (family: string) => Promise<CryptoKey>
): Promise<PreparedPhoto> {
	const bitmap = await createImageBitmap(blob);
	try {
		const { width, height } = bitmap;
		const canvas = new OffscreenCanvas(width, height),
			ctx = canvas.getContext('2d')!;
		ctx.drawImage(bitmap, 0, 0);
		const original = ctx.getImageData(0, 0, width, height).data;
		const patches: Patch[] = [],
			staffKeys: Record<string, string> = {};
		/**
		 * Seals one crop under its own content key: the bytes for the patch itself, a grant of that key to
		 * each family entitled to see it, and the key kept for staff. Named faces and the overlap areas
		 * between them differ only in which pixels they carry and who may open them.
		 */
		async function addPatch(
			part: string,
			rect: Rect,
			pixels: Uint8ClampedArray<ArrayBuffer>,
			families: string[],
			visible: boolean
		) {
			const face = await createContentKey();
			const crop = new OffscreenCanvas(rect.width, rect.height),
				c = crop.getContext('2d')!;
			c.putImageData(new ImageData(pixels, rect.width, rect.height), 0, 0);
			const data = toBase64Url(
				await encryptBytes(await bytes(await crop.convertToBlob({ type: 'image/png' })), face.key, {
					purpose: 'event-face',
					...context(event, id, part)
				})
			);
			const grants = await Promise.all(
				families.map(async (family) =>
					encryptData({ key: face.raw }, await familyKey(family), {
						purpose: 'event-grant',
						...context(event, id, part)
					})
				)
			);
			patches.push({
				id: part,
				x: rect.x,
				y: rect.y,
				width: rect.width,
				height: rect.height,
				data,
				grants,
				...(visible ? { shared: face.raw } : {})
			});
			staffKeys[part] = face.raw;
		}
		for (const region of regions) {
			if (!region.child) continue;
			const child = children.find((c) => c.id === region.child);
			if (!child) throw new UnreadableError();
			await addPatch(
				region.id,
				region,
				facePixels(
					original,
					width,
					region,
					regions.filter((r) => r.id !== region.id)
				),
				child.families,
				shared.has(child.id)
			);
		}
		const overlaps = overlapAreas(regions);
		if (patches.length + overlaps.length > maxPatches)
			throw new Error('Too many overlapping regions');
		for (const area of overlaps) {
			const involved = area.members.map((r) => children.find((c) => c.id === r.child)!);
			if (involved.some((c) => !c)) throw new UnreadableError();
			await addPatch(
				createId(),
				area,
				overlapPixels(original, width, area),
				overlapAudience(involved, shared),
				involved.every((c) => shared.has(c.id))
			);
		}
		const safe = await safePreview(blob, regions, { pixels: original, width, height });
		const type = baseTypes.find((known) => known === safe.type);
		if (!type) throw new Error(`Unusable encoding: ${safe.type}`);
		const base = toBase64Url(await bytes(safe));
		const staff = await encryptData({ regions, keys: staffKeys }, staffKey, {
			purpose: 'event-staff',
			...context(event, id)
		});
		const value: Package = { version: 1, width, height, base, type, patches, staff };
		const sealed = await encryptBytes(new TextEncoder().encode(JSON.stringify(value)), key, {
			purpose: 'event-photo',
			...context(event, id)
		});
		return { id, width, height, sealed };
	} finally {
		bitmap.close();
	}
}
function raster(data: string, type: string) {
	const value = fromBase64Url(data);
	if (!value) throw new UnreadableError();
	return new Blob([value], { type });
}
export async function renderPackage(
	event: string,
	photo: string,
	sealed: Uint8Array<ArrayBuffer>,
	key: CryptoKey,
	viewer: { family?: CryptoKey; staff?: CryptoKey; covered?: boolean } = {}
) {
	const decoded = await decryptBytes(sealed, key, {
		purpose: 'event-photo',
		...context(event, photo)
	});
	const p = fields(JSON.parse(new TextDecoder().decode(decoded)));
	if (
		p.version !== 1 ||
		!Number.isInteger(p.width) ||
		!Number.isInteger(p.height) ||
		Number(p.width) < 1 ||
		Number(p.height) < 1 ||
		Number(p.width) > editorSide ||
		Number(p.height) > editorSide ||
		typeof p.base !== 'string' ||
		!baseTypes.some((known) => known === p.type) ||
		!Array.isArray(p.patches) ||
		p.patches.length > maxPatches
	)
		throw new UnreadableError();
	const base = await createImageBitmap(raster(p.base, p.type as string));
	const canvas = new OffscreenCanvas(p.width as number, p.height as number),
		ctx = canvas.getContext('2d')!;
	try {
		if (base.width !== canvas.width || base.height !== canvas.height) throw new UnreadableError();
		ctx.drawImage(base, 0, 0);
	} finally {
		base.close();
	}
	let staffKeys: Record<string, unknown> = {};
	if (viewer.staff && typeof p.staff === 'string') {
		try {
			staffKeys = fields(
				fields(
					await decryptData(p.staff, viewer.staff, {
						purpose: 'event-staff',
						...context(event, photo)
					})
				).keys
			);
		} catch {
			/* Keep covers if damaged. */
		}
	}
	for (const value of viewer.covered ? [] : p.patches) {
		try {
			const patch = fields(value);
			if (
				!isId(patch.id) ||
				typeof patch.data !== 'string' ||
				!Array.isArray(patch.grants) ||
				patch.grants.length > maxGrants
			)
				continue;
			const { x, y, width, height } = patch;
			if (
				![x, y, width, height].every(Number.isInteger) ||
				Number(x) < 0 ||
				Number(y) < 0 ||
				Number(width) < 1 ||
				Number(height) < 1 ||
				Number(x) + Number(width) > canvas.width ||
				Number(y) + Number(height) > canvas.height
			)
				continue;
			let raw = viewer.staff ? staffKeys[patch.id] : patch.shared;
			if (!isContentKey(raw) && viewer.family)
				for (const grant of patch.grants) {
					try {
						raw = fields(
							await decryptData(grant, viewer.family, {
								purpose: 'event-grant',
								...context(event, photo, patch.id)
							})
						).key;
						if (isContentKey(raw)) break;
					} catch {
						/* Another family's envelope. */
					}
				}
			if (!isContentKey(raw)) continue;
			const data = fromBase64Url(patch.data);
			if (!data) continue;
			const image = await createImageBitmap(
				new Blob(
					[
						await decryptBytes(data, await openContentKey(raw), {
							purpose: 'event-face',
							...context(event, photo, patch.id)
						})
					],
					{ type: 'image/png' }
				)
			);
			try {
				if (image.width === width && image.height === height)
					ctx.drawImage(image, x as number, y as number);
			} finally {
				image.close();
			}
		} catch {
			/* Unreadable patches leave the safe base in place. */
		}
	}
	// What this device shows and saves, put together from the base and the patches it could open. It is
	// never uploaded, and the pixels it holds have been through an encoder already, so it is compressed too:
	// a lossless copy of them would be several megabytes for a family to keep.
	return canvas.convertToBlob({
		type: (await writesWebp()) ? 'image/webp' : 'image/jpeg',
		quality: 0.9
	});
}
export async function openEvent(record: EventRecord, groupKey: CryptoKey): Promise<OpenEvent> {
	const raw = fields(
		await decryptData(record.eventKey, groupKey, { purpose: 'event-key', event: record.id })
	).key;
	if (!isContentKey(raw)) throw new UnreadableError();
	const key = await openContentKey(raw);
	const value = fields(
		await decryptData(record.content, key, { purpose: 'event-content', event: record.id })
	);
	if (
		value.version !== 1 ||
		typeof value.title !== 'string' ||
		value.title.length > 160 ||
		typeof value.date !== 'string' ||
		!/^\d{4}-\d{2}-\d{2}$/.test(value.date) ||
		!Array.isArray(value.photos) ||
		!value.photos.length ||
		value.photos.length > mostEventPhotos
	)
		throw new UnreadableError();
	const photos: EventPhoto[] = value.photos.map((photo) => {
		const f = fields(photo);
		if (
			!isId(f.id) ||
			!Number.isInteger(f.width) ||
			!Number.isInteger(f.height) ||
			Number(f.width) < 1 ||
			Number(f.width) > editorSide ||
			Number(f.height) < 1 ||
			Number(f.height) > editorSide ||
			(f.text !== undefined && (typeof f.text !== 'string' || f.text.length > maxEventPhotoText))
		)
			throw new UnreadableError();
		const text = typeof f.text === 'string' && f.text ? f.text : undefined;
		return { id: f.id as string, width: f.width as number, height: f.height as number, text };
	});
	return {
		...record,
		key,
		value: {
			version: 1,
			title: value.title,
			date: value.date,
			description: readDocument(value.description),
			photos
		}
	};
}
