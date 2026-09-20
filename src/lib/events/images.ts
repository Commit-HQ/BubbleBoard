import { drawSmaller, openImage, writesWebp } from '$lib/photos';
import { stickerUrl } from './stickers';
import { coverPixels, type Region } from './editor';

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

/**
 * Actual flattened safe raster, not a CSS overlay. It deliberately reveals no faces in this first slice.
 * Every pixel of a cover is replaced with a flat colour and its sticker drawn over it before anything is
 * encoded, so no face reaches the encoder: this raster is compressed like a board photo, and only the face
 * patches, which do carry faces and their see-through edges, are kept lossless (docs/events-format.md).
 */
export async function safePreview(blob: Blob, regions: Region[]) {
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
		for (const region of regions) {
			const sticker = await openImage(await (await fetch(stickerUrl(region.sticker))).blob());
			try {
				ctx.drawImage(sticker, region.x, region.y, region.width, region.height);
			} finally {
				if (sticker instanceof ImageBitmap) sticker.close();
			}
		}
		// A photo with opaque covers on it has no see-through pixels, so JPEG serves where WebP can't be written.
		return await canvas.convertToBlob({
			type: (await writesWebp()) ? 'image/webp' : 'image/jpeg',
			quality: 0.85
		});
	} finally {
		image.close();
	}
}
