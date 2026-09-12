<script module lang="ts">
	// Pre-optimized photos (see src/lib/assets/photos/CREDITS.md): <name>-640/800/1280.avif, plus
	// <name>-800.webp for browsers without AVIF. A missing file fails the build and names the file.
	const files = import.meta.glob<string>('../assets/photos/*.{avif,webp}', {
		eager: true,
		query: '?url',
		import: 'default'
	});

	function file(name: string, width: number, format: 'avif' | 'webp') {
		const url = files[`../assets/photos/${name}-${width}.${format}`];
		if (!url)
			throw new Error(`Photo.svelte: src/lib/assets/photos/${name}-${width}.${format} is missing`);
		return url;
	}

	// Width and height are the WebP file's, so the image keeps its shape wherever it's placed.
	function photo(name: string, width: number, height: number) {
		const srcset = [640, 800, 1280].map((w) => `${file(name, w, 'avif')} ${w}w`).join(', ');
		return { srcset, src: file(name, 800, 'webp'), width, height };
	}

	const photos = {
		bubbles: photo('bubbles', 800, 1000),
		classroom: photo('classroom', 800, 800),
		painting: photo('painting', 800, 1000)
	};

	export type PhotoName = keyof typeof photos;
</script>

<script lang="ts">
	let {
		name,
		alt,
		sizes,
		eager = false
	}: {
		name: PhotoName;
		alt: string;
		/** How wide the photo is shown at each breakpoint, so the browser picks the right file. */
		sizes: string;
		/** For the photo in the first view only: load it right away, with high priority. */
		eager?: boolean;
	} = $props();
	const { srcset, src, width, height } = $derived(photos[name]);
</script>

<picture class="block size-full">
	<source type="image/avif" {srcset} {sizes} />
	<img
		class="block size-full object-cover"
		{src}
		{width}
		{height}
		{alt}
		loading={eager ? 'eager' : 'lazy'}
		fetchpriority={eager ? 'high' : 'auto'}
		decoding={eager ? 'auto' : 'async'}
	/>
</picture>
