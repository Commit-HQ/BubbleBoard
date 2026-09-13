import { drawSmaller, openImage } from '$lib/photos';

/**
 * Reads the QR code in a photo of a card, or returns undefined when there isn't a readable one. The
 * decoder is loaded only when someone scans.
 */
export async function readQrCode(photo: Blob): Promise<string | undefined> {
	try {
		const [{ default: decodeQR }, image] = await Promise.all([
			import('qr/decode.js'),
			openImage(photo)
		]);
		// Phone photos are large. A card's code is still sharp at this size, and decoding stays quick.
		const context = drawSmaller(image, 1600);
		if (!context) return undefined;
		const { width, height } = context.canvas;
		return decodeQR(context.getImageData(0, 0, width, height), {
			effort: Infinity,
			timeLimit: 3000
		});
	} catch {
		return undefined;
	}
}
