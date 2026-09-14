import libheif from 'libheif-js/libheif-wasm/libheif-bundle.mjs';

// HEIC and HEIF photos, which phones such as Samsung's save and only Safari opens itself. libheif, compiled to
// WebAssembly, opens them in the browser, which makes photos smaller and encrypts them before they're
// uploaded, so the server can't. It's large, so it's imported only when a picture the browser can't open is
// one (`openImage` in photos.ts).

/**
 * A HEIC or HEIF photo's pixels, as RGBA, turned the way it was taken. Each photo gets a libheif of its own,
 * whose memory goes once the photo is open. A file libheif can't read is refused.
 */
export async function decodeHeif(photo: Uint8Array) {
	const { HeifDecoder } = libheif();
	const images = new HeifDecoder().decode(photo);
	const image = images.find((candidate) => candidate.is_primary()) ?? images[0];
	if (!image) throw new Error('libheif can’t read this file');
	const [width, height] = [image.get_width(), image.get_height()];
	const pixels = { data: new Uint8ClampedArray(width * height * 4), width, height };
	await new Promise((resolve, reject) =>
		image.display(pixels, (shown) =>
			shown ? resolve(shown) : reject(new Error('libheif can’t decode this photo'))
		)
	);
	return pixels;
}
