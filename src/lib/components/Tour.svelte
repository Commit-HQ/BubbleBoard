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

	// The one-minute tour, opened from its button, which `class` places. src/lib/tour-player.js opens it in a
	// dialog and plays it; without scripts the button is a link to the 720p H.264 copy, which every browser
	// plays itself. Nothing of the video loads until it's opened, its poster included: a picture behind the
	// video that shows until its first frame does, rather than a `poster` attribute, which would load with the
	// page and can't pick a size or format.
	let { locale, class: place = '' }: { locale: Locale; class?: string } = $props();
	const t = $derived(messages[locale].tour);
	const poster = $derived(
		posterWidths.map((width) => `${file(`tour-${locale}-${width}.avif`)} ${width}w`).join(', ')
	);
	const pill = $derived(
		`${place} inline-flex items-center gap-2.5 rounded-full bg-ink py-1.5 pr-4 pl-1.5 text-sm font-semibold text-white shadow-xl shadow-ink/30 hover:-translate-y-0.5 motion-safe:transition-transform sm:gap-3 sm:py-2 sm:pr-5 sm:pl-2 sm:text-base`
	);
</script>

<svelte:head>
	<script type="module" src={player}></script>
</svelte:head>

{#snippet watch()}
	<span class="grid size-8 shrink-0 place-items-center rounded-full bg-white text-ink sm:size-10">
		<Icon name="play" class="size-3.5 fill-current sm:size-4" />
	</span>
	{t.watch}
	<span class="font-normal text-white/70">{length}</span>
{/snippet}

<a class={pill} href={file(`tour-${locale}-720-h264.mp4`)} aria-label={t.watchLabel} data-tour-link>
	{@render watch()}
</a>
<button
	type="button"
	class={pill}
	aria-label={t.watchLabel}
	aria-haspopup="dialog"
	hidden
	data-tour-open
>
	{@render watch()}
</button>

<!-- As wide as the screen allows with room above for the title, and no wider than the video's 1080p. -->
<dialog
	class="m-auto w-[min(calc(100%-2rem),75rem,calc((100dvh-11rem)*16/9))] max-w-none bg-transparent p-0 text-white backdrop:bg-ink/80 backdrop:backdrop-blur-sm"
	aria-labelledby="tour-title"
	aria-describedby="tour-copy"
	data-tour
>
	<div class="mb-4 flex items-start justify-between gap-4">
		<div>
			<h2 id="tour-title" class="text-2xl sm:text-3xl">{t.title}</h2>
			<p id="tour-copy" class="mt-1 max-w-2xl text-sm text-white/75 sm:text-base">{t.copy}</p>
		</div>
		<button
			type="button"
			class="grid size-11 shrink-0 place-items-center rounded-full bg-white text-ink hover:bg-white/85"
			aria-label={t.close}
			data-tour-close
		>
			<Icon name="x" class="size-5" />
		</button>
	</div>
	<div class="relative isolate aspect-video overflow-hidden rounded-3xl bg-ink shadow-2xl">
		<picture>
			<source
				type="image/avif"
				srcset={poster}
				sizes="(min-width: 77rem) 75rem, calc(100vw - 2rem)"
			/>
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
		<!-- Chromium greys out a video with controls until its first frame, which would hide the poster; the
		     controls stay clear. -->
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
	</div>
</dialog>
