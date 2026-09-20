import { fromBase64Url, toBase64Url } from '$lib/base64url';
import {
	createContentKey,
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
import type { ConsentRow, EventContent, EventRecord, OpenEvent } from './types';
import { safePreview } from './images';

const bytes = async (blob: Blob) => new Uint8Array(await blob.arrayBuffer());
const context = (event: string, photo: string, part?: string) => ({ event, photo, part });
export type ChildPolicy = { id: string; families: string[] };
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
				if (!row?.choice) return false;
				try {
					return (
						fields(
							await decryptData(row.choice, await key(family), {
								purpose: 'photo-choice',
								event: child.id,
								part: family
							})
						).share === true
					);
				} catch {
					return false;
				}
			})
		);
		if (choices.every(Boolean)) result.add(child.id);
	}
	return result;
}

/** Crop only this face. Overlaps have zero in every channel, including invisible RGB. */
export function facePixels(source: Uint8ClampedArray, width: number, region: Rect, others: Rect[]) {
	const output = new Uint8ClampedArray(region.width * region.height * 4);
	for (let y = 0; y < region.height; y++)
		for (let x = 0; x < region.width; x++) {
			const px = region.x + x,
				py = region.y + y;
			if (others.some((r) => px >= r.x && px < r.x + r.width && py >= r.y && py < r.y + r.height))
				continue;
			output.set(
				source.subarray((py * width + px) * 4, (py * width + px) * 4 + 4),
				(y * region.width + x) * 4
			);
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
	patches: Patch[];
	staff: string;
};
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
		for (const region of regions) {
			if (!region.child) continue;
			const child = children.find((c) => c.id === region.child);
			if (!child) throw new UnreadableError();
			const face = await createContentKey();
			const crop = new OffscreenCanvas(region.width, region.height),
				c = crop.getContext('2d')!;
			c.putImageData(
				new ImageData(
					facePixels(
						original,
						width,
						region,
						regions.filter((r) => r.id !== region.id)
					),
					region.width,
					region.height
				),
				0,
				0
			);
			const data = toBase64Url(
				await encryptBytes(await bytes(await crop.convertToBlob({ type: 'image/png' })), face.key, {
					purpose: 'event-face',
					...context(event, id, region.id)
				})
			);
			const grants = await Promise.all(
				child.families.map(async (family) =>
					encryptData({ key: face.raw }, await familyKey(family), {
						purpose: 'event-grant',
						...context(event, id, region.id)
					})
				)
			);
			patches.push({
				id: region.id,
				x: region.x,
				y: region.y,
				width: region.width,
				height: region.height,
				data,
				grants,
				...(shared.has(child.id) ? { shared: face.raw } : {})
			});
			staffKeys[region.id] = face.raw;
		}
		const base = toBase64Url(await bytes(await safePreview(blob, regions)));
		const staff = await encryptData({ regions, keys: staffKeys }, staffKey, {
			purpose: 'event-staff',
			...context(event, id)
		});
		const value: Package = { version: 1, width, height, base, patches, staff };
		const sealed = await encryptBytes(new TextEncoder().encode(JSON.stringify(value)), key, {
			purpose: 'event-photo',
			...context(event, id)
		});
		return { id, width, height, sealed };
	} finally {
		bitmap.close();
	}
}
function png(data: string) {
	const value = fromBase64Url(data);
	if (!value) throw new UnreadableError();
	return new Blob([value], { type: 'image/png' });
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
		Number(p.width) > 1920 ||
		Number(p.height) > 1920 ||
		typeof p.base !== 'string' ||
		!Array.isArray(p.patches) ||
		p.patches.length > 100
	)
		throw new UnreadableError();
	const base = await createImageBitmap(png(p.base));
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
				patch.grants.length > 20
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
	return canvas.convertToBlob({ type: 'image/png' });
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
		typeof value.description !== 'string' ||
		value.description.length > 5000 ||
		!Array.isArray(value.photos) ||
		!value.photos.length ||
		value.photos.length > 20
	)
		throw new UnreadableError();
	for (const p of value.photos) {
		const f = fields(p);
		if (
			!isId(f.id) ||
			!Number.isInteger(f.width) ||
			!Number.isInteger(f.height) ||
			Number(f.width) < 1 ||
			Number(f.width) > 1920 ||
			Number(f.height) < 1 ||
			Number(f.height) > 1920
		)
			throw new UnreadableError();
	}
	return { ...record, key, value: value as EventContent };
}
