<script lang="ts">
	// Pre-optimized photos: <name>-<640|800|1280>.avif plus <name>-800.webp as the fallback for
	// browsers without AVIF. See src/lib/assets/photos/CREDITS.md.
	const files = import.meta.glob<string>('../assets/photos/*.{avif,webp}', {
		eager: true,
		query: '?url',
		import: 'default'
	});

	let {
		name,
		alt,
		sizes,
		eager = false
	}: { name: string; alt: string; sizes: string; eager?: boolean } = $props();

	const file = (suffix: string) => files[`../assets/photos/${name}-${suffix}`];
	const srcset = [640, 800, 1280].map((w) => `${file(`${w}.avif`)} ${w}w`).join(', ');
</script>

<picture class="block size-full">
	<source type="image/avif" {srcset} {sizes} />
	<img
		class="block size-full object-cover"
		src={file('800.webp')}
		{alt}
		loading={eager ? 'eager' : 'lazy'}
		fetchpriority={eager ? 'high' : 'auto'}
		decoding={eager ? 'auto' : 'async'}
	/>
</picture>
