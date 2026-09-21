import { drawSmaller, openImage, writesWebp } from '$lib/photos';
import { stickerUrl } from './stickers';
import { coverPixels, type Region } from './editor';
import { editorSide } from './types';

/** Normalized, bounded working image; original files and camera metadata never leave this device. */
export async function prepareEditorImage(file: Blob) {
	const image = await openImage(file);
	try {
		const ctx = drawSmaller(image, editorSide);
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
export async function safePreview(blob: Blob, regions: Region[], raster?: SafeRaster) {
	const image = raster ? null : await createImageBitmap(blob);
	const { width, height } = raster ?? image!;
	try {
		const canvas = new OffscreenCanvas(width, height);
		const ctx = canvas.getContext('2d');
		if (!ctx) throw new Error('Canvas unavailable');
		let source = raster?.pixels;
		if (!source) {
			ctx.drawImage(image!, 0, 0);
			source = ctx.getImageData(0, 0, width, height).data;
		}
		ctx.putImageData(
			new ImageData(coverPixels(source, width, height, regions), width, height),
			0,
			0
		);
		// At most three stickers exist, so fetch and decode each one once however many faces wear it.
		const worn = new Map(
			await Promise.all(
				[...new Set(regions.map((r) => r.sticker ?? 'smile'))].map(
					async (name) =>
						[name, await openImage(await (await fetch(stickerUrl(name))).blob())] as const
				)
			)
		);
		try {
			for (const region of regions)
				ctx.drawImage(
					worn.get(region.sticker ?? 'smile')!,
					region.x,
					region.y,
					region.width,
					region.height
				);
		} finally {
			for (const sticker of worn.values()) if (sticker instanceof ImageBitmap) sticker.close();
		}
		// A photo with opaque covers on it has no see-through pixels, so JPEG serves where WebP can't be written.
		return await canvas.convertToBlob({
			type: (await writesWebp()) ? 'image/webp' : 'image/jpeg',
			quality: 0.85
		});
	} finally {
		image?.close();
	}
}

/** A raster the caller has already decoded, so safePreview needn't decode the same blob a second time. */
export type SafeRaster = { pixels: Uint8ClampedArray; width: number; height: number };

/**
 * A small copy of a photo this device has put together, for a gallery's grid. Thirty photos drawn at their
 * full size as thumbnails would each be held decoded, which is more memory than an older phone has to give.
 */
export async function thumbnail(picture: Blob) {
	const image = await createImageBitmap(picture);
	try {
		const ctx = drawSmaller(image, 480);
		if (!ctx) throw new Error('Canvas unavailable');
		return await ctx.canvas.convertToBlob({ type: 'image/jpeg', quality: 0.8 });
	} finally {
		image.close();
	}
}
