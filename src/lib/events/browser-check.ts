// Invoked only by the development fixture: real canvas encoding, encryption, decoding and rendering.
import {
	createContentKey,
	createId,
	decryptBytes,
	decryptData,
	fields,
	openContentKey
} from '$lib/crypto';
import { fromBase64Url } from '$lib/base64url';
import { preparePackage, renderPackage } from './package';
import { manualRegion } from './editor';
export async function checkEventPixels() {
	const [event, photo, a, b] = Array.from({ length: 4 }, () => createId());
	const keys = await Promise.all(Array.from({ length: 4 }, () => createContentKey()));
	const [eventKey, staff, familyA, familyB] = keys;
	const canvas = new OffscreenCanvas(80, 40),
		ctx = canvas.getContext('2d')!;
	ctx.fillStyle = '#ffffff';
	ctx.fillRect(0, 0, 80, 40);
	ctx.fillStyle = '#ff0000';
	ctx.fillRect(5, 5, 30, 25);
	ctx.fillStyle = '#0000ff';
	ctx.fillRect(25, 5, 30, 25);
	const regions = [
		{
			...manualRegion(a, 80, 40),
			x: 5,
			y: 5,
			width: 30,
			height: 25,
			child: 'a',
			sticker: 'star' as const
		},
		{
			...manualRegion(b, 80, 40),
			x: 25,
			y: 5,
			width: 30,
			height: 25,
			child: 'b',
			sticker: 'heart' as const
		}
	];
	const source = await canvas.convertToBlob({ type: 'image/png' });
	const prepared = await preparePackage(
		event,
		photo,
		source,
		regions,
		eventKey.key,
		staff.key,
		[
			{ id: 'a', families: ['a'] },
			{ id: 'b', families: ['b'] }
		],
		new Set(),
		async (f) => (f === 'a' ? familyA.key : familyB.key)
	);
	const pixel = async (blob: Blob, x: number, y: number) => {
		const image = await createImageBitmap(blob);
		ctx.clearRect(0, 0, 80, 40);
		ctx.drawImage(image, 0, 0);
		image.close();
		return [...ctx.getImageData(x, y, 1, 1).data].join(',');
	};
	const assert = (ok: boolean, name: string) => {
		if (!ok) throw new Error(name);
	};
	const base = await renderPackage(event, photo, prepared.sealed, eventKey.key, { covered: true });
	const left = await renderPackage(event, photo, prepared.sealed, eventKey.key, {
		family: familyA.key
	});
	const right = await renderPackage(event, photo, prepared.sealed, eventKey.key, {
		family: familyB.key
	});
	const outsider = await renderPackage(event, photo, prepared.sealed, eventKey.key);
	assert((await pixel(left, 10, 15)) === '255,0,0,255', 'Family A own face');
	assert((await pixel(right, 45, 15)) === '0,0,255,255', 'Family B own face');
	assert((await pixel(left, 45, 15)) === (await pixel(base, 45, 15)), 'Family A cannot see B');
	assert((await pixel(right, 10, 15)) === (await pixel(base, 10, 15)), 'Family B cannot see A');
	assert((await pixel(left, 28, 15)) === (await pixel(base, 28, 15)), 'Overlap stays covered');
	assert((await pixel(outsider, 10, 15)) === (await pixel(base, 10, 15)), 'Outsider sees base');
	const decoded = JSON.parse(
		new TextDecoder().decode(
			await decryptBytes(prepared.sealed, eventKey.key, { purpose: 'event-photo', event, photo })
		)
	);
	const patch = decoded.patches[0];
	const grant = fields(
		await decryptData(patch.grants[0], familyA.key, {
			purpose: 'event-grant',
			event,
			photo,
			part: a
		})
	);
	const raw = await decryptBytes(
		fromBase64Url(patch.data)!,
		await openContentKey(grant.key as string),
		{ purpose: 'event-face', event, photo, part: a }
	);
	assert(
		(await pixel(new Blob([raw], { type: 'image/png' }), 23, 10)) === '0,0,0,0',
		'Decrypted overlap has zero RGB and alpha'
	);
	const common = await preparePackage(
		event,
		createId(),
		source,
		regions,
		eventKey.key,
		staff.key,
		[
			{ id: 'a', families: ['a'] },
			{ id: 'b', families: ['a', 'b'] }
		],
		new Set(),
		async (f) => (f === 'a' ? familyA.key : familyB.key)
	);
	const commonView = await renderPackage(event, common.id, common.sealed, eventKey.key, {
		family: familyA.key
	});
	assert(
		(await pixel(commonView, 28, 15)) === '0,0,255,255',
		'Family allowed both faces sees intact overlap'
	);
	return 'PASS: family A, family B, outsider, overlap, decoded patch pixels';
}
