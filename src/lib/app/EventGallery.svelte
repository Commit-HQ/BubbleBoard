<script lang="ts">
	import { untrack } from 'svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { nextWaiting } from '$lib/events/gallery';
	import { thumbnail } from '$lib/events/images';
	import type { OpenEvent } from '$lib/events/types';
	import { savePicture, savePictures } from '$lib/files';
	import { errorMessage, messages, type Locale } from '$lib/i18n';
	import { appPath } from '$lib/paths';
	import EventActions from './EventActions.svelte';
	import EventHeading from './EventHeading.svelte';
	import PictureViewer from './PictureViewer.svelte';
	import { getApp, Task, type Picture } from './state.svelte';
	import { alert, button, field, surface } from './ui';

	// An event's gallery, as a family or a teacher opens it from the board: what it was and when, then every
	// photo as a small square. Each one is decrypted and put together on this device for whoever holds this
	// card, so they fill in one after another rather than arriving as a page of pictures; the server has no
	// thumbnail to send and never learns whose child is in which photo. A tap opens a photo on the whole
	// screen, where a swipe moves through the gallery and the teacher's words show underneath.
	let { locale, event, onremoved }: { locale: Locale; event: OpenEvent; onremoved: () => void } =
		$props();
	const app = getApp();
	const task = new Task();
	const t = $derived(messages[locale].app.events);
	const p = $derived(messages[locale].app.eventEditor);
	/** A photo is put together on a canvas that iPhones and iPads before iOS 16.4 don't have. */
	const tooOld = typeof OffscreenCanvas === 'undefined';
	const photos = $derived(event.value.photos);
	// Kept by the event's ID: a refreshed board hands over the same event as a new object, and that must not
	// let go of the photos already opened.
	const eventId = $derived(event.id);
	/**
	 * Whose eyes a staff device looks through: its own (`'me'`), every cover on (`'base'`), or a family's
	 * card. A teacher holds every key, so her own view shows every face; this lets her check what a family
	 * actually gets after the event is up, the way the review step does before.
	 */
	let viewer = $state('me');
	const asFamily = $derived(app.status === 'staff' && viewer !== 'me');
	const families = $derived(
		app.status === 'staff'
			? app.catalog.families.filter((f) => f.classrooms.includes(event.classroom))
			: []
	);
	const childrenOf = (family: string) =>
		app.catalog.children
			.filter((c) => c.classroom === event.classroom && c.families.includes(family))
			.map((c) => c.name)
			.join(', ');
	/**
	 * Staff see every child, so a mark saying whose child is here would mean nothing to them; looking as a
	 * family, the mark shows what that family sees.
	 */
	const family = $derived(app.status === 'family' || asFamily);
	/**
	 * Each photo as it stands here: opened on this device, still opening, or one that wouldn't open. The
	 * teacher's own view holds the whole photo too; a look through a family's eyes holds only the small copy,
	 * and composes the whole photo when it's opened on the full screen.
	 */
	type Tile = { small: string; mine: boolean; picture?: Picture };
	let tiles = $state.raw<(Tile | 'failed' | undefined)[]>([]);
	/** The photo on the full screen as a family sees it, composed for as long as it's there. */
	let enlarged = $state.raw<{ index: number; picture: Picture }>();
	/** Which of the photos shown the whole screen is on, or -1 while the gallery is on the page. */
	let position = $state(-1);
	let onlyMine = $state(false);
	let prepared = $state(0);
	/** Wakes the loop below when a photo that wouldn't open is asked for again; set while it's running. */
	let again: (() => void) | undefined;

	const marked = $derived(tiles.map((tile) => family && typeof tile === 'object' && tile.mine));
	const mine = $derived(marked.filter(Boolean).length);
	const opening = $derived(tiles.filter((tile) => tile === undefined).length);
	/** The photos the grid and the whole screen move through: all of them, or only this family's child's. */
	const shown = $derived(photos.map((_, at) => at).filter((at) => !onlyMine || marked[at]));
	const at = $derived(position >= 0 ? (shown[position] ?? 0) : 0);
	const viewed = $derived.by(() => {
		if (viewer !== 'me') return enlarged?.index === at ? enlarged.picture : undefined;
		const tile = tiles[at];
		return typeof tile === 'object' ? tile.picture : undefined;
	});

	$effect(() => {
		void eventId;
		return untrack(() => app.showEventPictures(event));
	});
	// One photo at a time, nearest the one being looked at first, and nothing at all once the family has left
	// the page or opened another event. A photo already open comes back from the app without being fetched, and
	// one this device composed before comes back from the device (src/lib/events/cache.ts).
	$effect(() => {
		void eventId;
		const as = viewer;
		return untrack(() => {
			let cancelled = false;
			tiles = photos.map(() => undefined);
			position = -1;
			// Whose child a photo shows depends on whose eyes these are, so each look starts from every photo.
			onlyMine = false;
			// The grid shows a small copy of each photo. The teacher's own view keeps the whole photo, which
			// stays with the app while the event is open; a family's view is drawn small from the start.
			const open = async (photo: string): Promise<Tile> => {
				if (as === 'me') {
					const picture = await app.eventPicture(event, photo);
					const small = URL.createObjectURL(await thumbnail(picture.blob));
					return { small, mine: picture.mine === true, picture };
				}
				const { blob, mine } = await app.eventThumbnailAs(event, photo, as);
				return { small: URL.createObjectURL(blob), mine };
			};
			const release = (tile: Tile) => URL.revokeObjectURL(tile.small);
			void (async () => {
				while (!cancelled) {
					const next = nextWaiting(
						tiles.map((tile) => tile === undefined),
						at
					);
					if (next < 0) {
						// Everything is open: wait here until a tap asks for one to be tried again.
						await new Promise<void>((resolve) => (again = resolve));
						continue;
					}
					const opened = await open(photos[next].id).catch(() => 'failed' as const);
					if (!cancelled) tiles = tiles.map((tile, i) => (i === next ? opened : tile));
					else if (opened !== 'failed') release(opened);
				}
			})();
			return () => {
				cancelled = true;
				again?.();
				again = undefined;
				for (const tile of tiles) if (typeof tile === 'object') release(tile);
			};
		});
	});

	// Looking through a family's eyes, the photo on the full screen is composed whole when it gets there and
	// let go of when the screen moves on.
	$effect(() => {
		if (position < 0 || viewer === 'me') return;
		const as = viewer;
		const index = at;
		return untrack(() => {
			let cancelled = false;
			let made: Picture | undefined;
			app.eventPictureAs(event, photos[index].id, as).then(
				(picture) => {
					if (cancelled) return URL.revokeObjectURL(picture.url);
					made = picture;
					enlarged = { index, picture };
				},
				() => {}
			);
			return () => {
				cancelled = true;
				if (made) URL.revokeObjectURL(made.url);
				enlarged = undefined;
			};
		});
	});

	/** Tapping a photo that wouldn't open asks for it again. */
	function tryAgain(index: number) {
		tiles = tiles.map((tile, i) => (i === index ? undefined : tile));
		again?.();
		again = undefined;
	}
	function show(index: number) {
		const tile = tiles[index];
		if (tile === 'failed') tryAgain(index);
		else position = shown.indexOf(index);
	}
	function move(step: number) {
		position = Math.max(0, Math.min(shown.length - 1, position + step));
		// A photo that didn't open is tried again when it's swiped to, rather than waiting for nothing.
		const next = shown[position];
		if (tiles[next] === 'failed') tryAgain(next);
	}
	/** Every photo of the gallery, composed on this device one after another, then saved together. */
	function saveAll() {
		task.run(async () => {
			const all: Blob[] = [];
			try {
				for (const photo of photos) {
					all.push((await app.eventPicture(event, photo.id)).blob);
					prepared = all.length;
				}
				if (all.length === 1) await savePicture(all[0], event.value.title);
				else await savePictures(all, event.value.title);
			} finally {
				prepared = 0;
			}
		});
	}
	const until = $derived(
		new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long' }).format(event.expiresAt)
	);
</script>

<div class="grid gap-5">
	<div class="{surface} grid gap-3">
		<EventHeading {locale} {event} />
	</div>

	{#if tooOld}
		<p class={alert} role="alert">{t.tooOld}</p>
	{:else}
		{#if families.length}
			<label class={field.label}>
				<span class={field.name}>{t.previewAs}</span>
				<select class={field.input} bind:value={viewer}>
					<option value="me">{t.asMyself}</option>
					<option value="base">{t.base}</option>
					{#each families as item (item.id)}
						<option value={item.id}>{item.name} — {childrenOf(item.id)}</option>
					{/each}
				</select>
			</label>
		{/if}

		{#if mine > 0}
			<div class="flex flex-wrap gap-2" role="group" aria-label={t.filter}>
				{#each [[false, t.allPhotos], [true, t.withMyChild]] as const as [only, label] (label)}
					<button
						type="button"
						class={button.chip}
						aria-pressed={onlyMine === only}
						onclick={() => {
							onlyMine = only;
							position = -1;
						}}>{label}</button
					>
				{/each}
			</div>
		{/if}

		<ul class="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6" aria-label={p.photos}>
			{#each shown as index (photos[index].id)}
				{@const tile = tiles[index]}
				<li>
					<button
						type="button"
						class="relative block aspect-square w-full cursor-zoom-in overflow-hidden rounded-2xl bg-ink/5 ring-1 ring-ink/10 transition hover:ring-ink/25"
						aria-label={tile === 'failed' ? t.retry : p.photo(index + 1, photos.length)}
						onclick={() => show(index)}
					>
						{#if tile === 'failed'}
							<span class="grid size-full place-items-center text-muted">
								<Icon name="refresh" class="size-5" />
							</span>
						{:else if tile}
							<img src={tile.small} alt="" class="size-full object-cover" />
						{/if}
						<span
							class="absolute bottom-1 left-1 rounded-full bg-ink/55 px-2 text-xs font-semibold text-white"
							aria-hidden="true">{index + 1}</span
						>
						{#if marked[index]}
							<span class="absolute top-1 right-1 rounded-full frosted p-1 text-ink">
								<Icon name="heart" class="size-4" />
								<span class="sr-only">{t.withMyChild}</span>
							</span>
						{/if}
					</button>
				</li>
			{/each}
		</ul>

		{#if opening}
			<p class="font-semibold text-muted" role="status">
				{t.openingPhotos(photos.length - opening, photos.length)}
			</p>
		{/if}
	{/if}

	{#if task.error}<p class={alert} role="alert">{errorMessage(locale, task.error)}</p>{/if}
	{#if prepared}
		<p class="font-semibold text-muted" role="status">
			{t.preparingPhoto(prepared, photos.length)}
		</p>
	{/if}
	<p class="text-sm text-muted">{t.staysUntil(until)}</p>
	<div class="flex flex-wrap gap-3">
		<button type="button" class={button.primary} disabled={tooOld || task.busy} onclick={saveAll}>
			<Icon name="download" class="size-4" />{photos.length > 1 ? t.downloadAll : t.download}
		</button>
		{#if app.canChangeEvent(event)}
			<EventActions {locale} {event} {onremoved} />
		{/if}
	</div>

	{#if app.status === 'family'}
		<p class="text-sm text-muted">
			{t.stickersExplained}
			<a class="font-semibold underline underline-offset-4" href={appPath(locale, 'options')}
				>{messages[locale].app.options.title}</a
			>
		</p>
	{/if}
</div>

{#if position >= 0}
	<PictureViewer
		{locale}
		label={`${event.value.title} — ${p.photo(at + 1, photos.length)}`}
		picture={viewed}
		name={event.value.title}
		number={at + 1}
		caption={photos[at].text}
		gallery={{ index: position, count: shown.length, onmove: move }}
		onclose={() => (position = -1)}
	/>
{/if}
