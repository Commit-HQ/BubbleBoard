// The parts of libheif-js that src/lib/heif.ts uses. Its WebAssembly bundle, which carries the .wasm file
// inside it, comes without types.
declare module 'libheif-js/libheif-wasm/libheif-bundle.mjs' {
	type Pixels = { data: Uint8ClampedArray; width: number; height: number };

	interface HeifImage {
		is_primary(): boolean;
		get_width(): number;
		get_height(): number;
		/** Decodes the image into `pixels`, then calls back with them, or with nothing when it can't. */
		display(pixels: Pixels, done: (pixels: Pixels | null) => void): void;
	}

	export default function libheif(): {
		HeifDecoder: new () => { decode(file: Uint8Array): HeifImage[] };
	};
}
