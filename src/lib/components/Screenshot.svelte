<script module lang="ts">
	import type { Locale } from '$lib/i18n';

	// Screens of the app in each language, taken from a local installation with made-up names and the landing
	// page's stock photos: <name>-<locale>-390/780.avif, plus <name>-<locale>-780.webp for browsers without AVIF.
	// A missing file fails the build and names the file.
	const files = import.meta.glob<string>('../assets/explore/*.{avif,webp}', {
		eager: true,
		query: '?url',
		import: 'default'
	});

	function file(name: string, locale: Locale, width: number, format: 'avif' | 'webp') {
		const path = `../assets/explore/${name}-${locale}-${width}.${format}`;
		if (!files[path])
			throw new Error(`Screenshot.svelte: ${path.replace('..', 'src/lib')} is missing`);
		return files[path];
	}
</script>

<script lang="ts">
	let {
		name,
		locale,
		alt,
		eager = false
	}: {
		name: string;
		locale: Locale;
		alt: string;
		/** For the screen in the first view only: load it right away, with high priority. */
		eager?: boolean;
	} = $props();
	const srcset = $derived(
		[390, 780].map((width) => `${file(name, locale, width, 'avif')} ${width}w`).join(', ')
	);
</script>

<!-- A phone drawn around the screen. The screens are 390 by 844 points, which the frame's inside keeps. -->
<div
	class="w-60 shrink-0 rounded-[2.6rem] bg-ink p-2 shadow-2xl ring-1 shadow-indigo-950/30 ring-white/20 sm:w-72 sm:rounded-[3rem] sm:p-2.5 lg:w-80"
>
	<picture class="block overflow-hidden rounded-[2.1rem] bg-canvas sm:rounded-[2.4rem]">
		<source
			type="image/avif"
			{srcset}
			sizes="(min-width: 1024px) 19rem, (min-width: 640px) 17rem, 14rem"
		/>
		<img
			class="block aspect-390/844 w-full"
			src={file(name, locale, 780, 'webp')}
			width="780"
			height="1688"
			{alt}
			loading={eager ? 'eager' : 'lazy'}
			fetchpriority={eager ? 'high' : 'auto'}
			decoding={eager ? 'auto' : 'async'}
		/>
	</picture>
</div>
