<script module lang="ts">
	// Pre-optimized photos: <name>-<width>.avif plus <name>-800.webp as the fallback for browsers
	// without AVIF. See src/lib/assets/photos/CREDITS.md.
	const files = import.meta.glob<string>('../assets/photos/*.{avif,webp}', {
		eager: true,
		query: '?url',
		import: 'default'
	});

	const photos: Record<string, { srcset: string[]; src: string }> = {};
	for (const [path, url] of Object.entries(files)) {
		const [, name, width, format] = path.match(/(\w+)-(\d+)\.(avif|webp)$/)!;
		photos[name] ??= { srcset: [], src: '' };
		if (format === 'avif') photos[name].srcset.push(`${url} ${width}w`);
		else photos[name].src = url;
	}

	// Photos are at most ~600px wide on large screens; close enough to pick the right file.
	const sizes = '(min-width: 1024px) 600px, 100vw';
</script>

<script lang="ts">
	let { name, alt, eager = false }: { name: string; alt: string; eager?: boolean } = $props();
	const photo = $derived(photos[name]);
</script>

<picture class="block size-full">
	<source type="image/avif" srcset={photo.srcset.join(', ')} {sizes} />
	<img
		class="block size-full object-cover"
		src={photo.src}
		{alt}
		loading={eager ? 'eager' : 'lazy'}
		fetchpriority={eager ? 'high' : 'auto'}
		decoding={eager ? 'auto' : 'async'}
	/>
</picture>
