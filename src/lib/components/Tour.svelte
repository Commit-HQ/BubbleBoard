<script module lang="ts">
	import player from '$lib/tour-player.js?url';
	import { largeScreens, posterWidths, tourSeconds, tourSources, tourType } from '$lib/tour';

	// The tour's files (src/lib/tour.ts): tour-<locale>-<name>.mp4, and its poster as
	// tour-<locale>-<width>.avif, plus tour-<locale>-1280.webp. A missing file fails the build and names it.
	const files = import.meta.glob<string>('../assets/tour/*.{mp4,avif,webp}', {
		eager: true,
		query: '?url',
		import: 'default'
	});

	function file(name: string) {
		const url = files[`../assets/tour/${name}`];
		if (!url) throw new Error(`Tour.svelte: src/lib/assets/tour/${name} is missing`);
		return url;
	}

	const length = `${Math.floor(tourSeconds / 60)}:${String(tourSeconds % 60).padStart(2, '0')}`;
</script>

<script lang="ts">
	import { messages, type Locale } from '$lib/i18n';
	import Icon from './Icon.svelte';

	// The one-minute tour on the landing page. Nothing of the video loads until it's played, and the poster,
	// a picture behind the video that shows until its first frame does, loads only as it nears the screen.
	// Without scripts the video plays with the browser's own controls; src/lib/tour-player.js puts the
	// page's play button in their place.
	let {
		locale,
		sizes
	}: {
		locale: Locale;
		/** How wide the tour is shown at each breakpoint, so the browser picks the poster's file. */
		sizes: string;
	} = $props();
	const t = $derived(messages[locale].tour);
	const poster = $derived(
		posterWidths.map((width) => `${file(`tour-${locale}-${width}.avif`)} ${width}w`).join(', ')
	);
</script>

<svelte:head>
	<script type="module" src={player}></script>
</svelte:head>

<div
	class="relative isolate aspect-video overflow-hidden rounded-4xl bg-white/60 shadow-2xl shadow-indigo-950/25"
	data-tour
>
	<picture>
		<source type="image/avif" srcset={poster} {sizes} />
		<img
			class="absolute inset-0 size-full object-cover"
			src={file(`tour-${locale}-1280.webp`)}
			width="1280"
			height="720"
			alt=""
			loading="lazy"
			decoding="async"
		/>
	</picture>
	<!-- No poster attribute: it would load with the page, and it can't pick a size or format. Chromium greys
	     out a video with controls until its first frame, which would hide the poster; the controls stay clear. -->
	<video
		class="relative block size-full [&::-webkit-media-controls]:bg-transparent"
		controls
		preload="none"
		playsinline
		width="1920"
		height="1080"
		aria-label={t.label}
	>
		{#each tourSources as source (source.name)}
			<source
				src={file(`tour-${locale}-${source.name}.mp4`)}
				type={tourType(source)}
				media={source.height > 720 ? largeScreens : undefined}
				data-codec={source.codec}
				data-video={source.video}
				data-width={source.width}
				data-height={source.height}
				data-bitrate={source.bitrate}
			/>
		{/each}
	</video>
	<button
		type="button"
		class="group absolute inset-0 flex items-end rounded-4xl p-3 focus-visible:outline-offset-[-0.75rem] sm:p-6"
		aria-label={t.watchLabel}
		hidden
	>
		<!-- Smaller on a phone, where the poster's words come close to the corner. -->
		<span
			class="inline-flex items-center gap-2.5 rounded-full bg-ink py-1.5 pr-4 pl-1.5 text-sm font-semibold text-white shadow-xl shadow-ink/30 group-hover:-translate-y-0.5 motion-safe:transition-transform sm:gap-3 sm:py-2 sm:pr-5 sm:pl-2 sm:text-base"
		>
			<span
				class="grid size-8 shrink-0 place-items-center rounded-full bg-white text-ink sm:size-10"
			>
				<Icon name="play" class="size-3.5 fill-current sm:size-4" />
			</span>
			{t.watch}
			<span class="font-normal text-white/70">{length}</span>
		</span>
	</button>
</div>
