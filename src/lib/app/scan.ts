/**
 * Reads the QR code in a photo of a card, or returns undefined when there isn't a readable one. The
 * decoder is loaded only when someone scans.
 */
export async function readQrCode(photo: Blob): Promise<string | undefined> {
	let bitmap: ImageBitmap | undefined;
	try {
		const [{ default: decodeQR }, image] = await Promise.all([
			import('qr/decode.js'),
			createImageBitmap(photo)
		]);
		bitmap = image;
		// Phone photos are large. A card's code is still sharp at this size, and decoding stays quick.
		const scale = Math.min(1, 1600 / Math.max(image.width, image.height));
		const width = Math.round(image.width * scale);
		const height = Math.round(image.height * scale);
		const context = new OffscreenCanvas(width, height).getContext('2d');
		if (!context) return undefined;
		context.drawImage(image, 0, 0, width, height);
		return decodeQR(context.getImageData(0, 0, width, height), {
			effort: Infinity,
			timeLimit: 3000
		});
	} catch {
		return undefined;
	} finally {
		bitmap?.close();
	}
}
