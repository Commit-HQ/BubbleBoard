import { drawSmaller, openImage } from '$lib/photos';
import stickerUrl from '$lib/assets/face-sticker.svg';
import { coverPixels, type Rect } from './editor';

/** Normalized, bounded working image; original files and camera metadata never leave this device. */
export async function prepareEditorImage(file: Blob) {
	const image = await openImage(file);
	try {
		const ctx = drawSmaller(image, 1920);
		if (!ctx) throw new Error('Canvas unavailable');
		const blob = await ctx.canvas.convertToBlob({ type: 'image/jpeg', quality: 0.94 });
		return { blob, width: ctx.canvas.width, height: ctx.canvas.height };
	} finally {
		if (image instanceof ImageBitmap) image.close();
	}
}

/** Actual flattened safe raster, not a CSS overlay. It deliberately reveals no faces in this first slice. */
export async function safePreview(blob: Blob, regions: Rect[]) {
	const image = await createImageBitmap(blob);
	try {
		const canvas = new OffscreenCanvas(image.width, image.height);
		const ctx = canvas.getContext('2d');
		if (!ctx) throw new Error('Canvas unavailable');
		ctx.drawImage(image, 0, 0);
		const original = ctx.getImageData(0, 0, image.width, image.height);
		ctx.putImageData(
			new ImageData(
				coverPixels(original.data, image.width, image.height, regions),
				image.width,
				image.height
			),
			0,
			0
		);
		const sticker = await openImage(await (await fetch(stickerUrl)).blob());
		try {
			for (const region of regions)
				ctx.drawImage(sticker, region.x, region.y, region.width, region.height);
		} finally {
			if (sticker instanceof ImageBitmap) sticker.close();
		}
		return await canvas.convertToBlob({ type: 'image/png' });
	} finally {
		image.close();
	}
}
