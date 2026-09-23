<script lang="ts">
	import { untrack } from 'svelte';
	import Icon from '$lib/components/Icon.svelte';
	import type { Region } from '$lib/events/editor';
	import { stickers, type Sticker } from '$lib/events/stickers';
	import { messages, type Locale } from '$lib/i18n';
	import { button, field } from './ui';

	// What the teacher decides about one cover, under the photo: a crop of the original so the face can be
	// told apart without hiding every sticker, then the classroom's children, keeping it covered instead, and
	// the sticker it wears. Nothing here suggests who a face might be, and nothing changes what a family may see.
	let {
		locale,
		url,
		width,
		height,
		regions,
		selected,
		children,
		remaining,
		feedback,
		onassign,
		oncoverrest,
		onremove,
		onsticker
	}: {
		locale: Locale;
		url: string;
		width: number;
		height: number;
		regions: Region[];
		selected?: Region;
		children: { id: string; name: string }[];
		/** How many faces of this photo still need a name or a cover decision. */
		remaining: number;
		/** What just happened, said once for everyone rather than only for screen readers. */
		feedback: string;
		onassign: (child: string | null) => void;
		oncoverrest: () => void;
		onremove: () => void;
		onsticker: (sticker: Sticker) => void;
	} = $props();

	const t = $derived(messages[locale].app.eventEditor);
	const id = $props.id();
	let search = $state('');
	/** The eighteen stickers fill a phone's screen, so they wait behind the one the cover is wearing. */
	let picking = $state(false);
	// A long list gets a search box; a classroom of a dozen names doesn't need one.
	const searchable = $derived(children.length > 8);
	const shown = $derived(
		searchable && search
			? children.filter((child) =>
					child.name.toLocaleLowerCase(locale).includes(search.toLocaleLowerCase(locale))
				)
			: children
	);
	const named = $derived(children.find((child) => child.id === selected?.child)?.name);
	const number = $derived(regions.findIndex((region) => region.id === selected?.id) + 1);
	/** Children already named on another face of this photo: still choosable, since a mirror shows two. */
	const elsewhere = $derived(
		new Set(
			regions.filter((region) => region.id !== selected?.id && region.child).map((r) => r.child)
		)
	);
	// Children the teacher has not put in this photo yet come first, and the ones they have already named drop
	// to the end, each group in the classroom's own order. This follows what the teacher has done, never
	// anything read from the face itself: a face never suggests who a child is.
	const ordered = $derived([
		...shown.filter((child) => !elsewhere.has(child.id)),
		...shown.filter((child) => elsewhere.has(child.id))
	]);
	// A new face starts with an empty search and the stickers put away, so the whole classroom is there again.
	// Moving or restyling the same cover leaves what was typed alone.
	let searched = untrack(() => selected?.id);
	$effect(() => {
		if (selected?.id !== searched) {
			searched = selected?.id;
			search = '';
			picking = false;
		}
	});
</script>

{#snippet stickerChoice(cover: Region)}
	<div class="grid justify-items-start gap-2">
		<button
			type="button"
			class={button.secondary}
			aria-expanded={picking}
			aria-controls="{id}-stickers"
			onclick={() => (picking = !picking)}
		>
			<img src={stickers[cover.sticker ?? 'smile']} alt="" class="size-6" />{t.sticker}
		</button>
		<div
			id="{id}-stickers"
			class="flex flex-wrap items-center gap-2"
			hidden={!picking}
			role="group"
			aria-label={t.sticker}
		>
			{#each Object.entries(stickers) as [name, source] (name)}
				<!-- A ring marks the chosen sticker, which forced colours would otherwise flatten. -->
				<button
					type="button"
					class="grid size-11 place-items-center rounded-full ring-1 ring-ink/10 transition hover:bg-ink/5 aria-pressed:ring-3 aria-pressed:ring-accent"
					aria-label={t.stickerNames[name as Sticker]}
					title={t.stickerNames[name as Sticker]}
					aria-pressed={(cover.sticker ?? 'smile') === name}
					onclick={() => {
						onsticker(name as Sticker);
						picking = false;
					}}
				>
					<img src={source} alt="" class="size-7" />
				</button>
			{/each}
		</div>
	</div>
{/snippet}

<div class="grid gap-4 rounded-3xl glass p-5">
	{#if selected?.fixed}
		<!-- A face kept covered when the photo went up has no picture anywhere: there is nothing to show under
		     the cover and nobody it could be named, so the cover stays and only its sticker can change. -->
		<div class="flex items-start gap-3">
			<Icon name="eyeOff" class="mt-1 size-5 shrink-0 text-muted" />
			<div class="min-w-0">
				<h3 class="font-sans text-lg font-semibold">{t.face(number)}</h3>
				<p class="mt-1 text-sm text-muted">{t.fixedCover}</p>
			</div>
		</div>
		{@render stickerChoice(selected)}
	{:else if selected}
		<div class="flex items-center gap-4">
			<svg
				viewBox={`${selected.x} ${selected.y} ${selected.width} ${selected.height}`}
				class="size-16 shrink-0 rounded-2xl bg-ink/5 ring-1 ring-ink/10"
				role="img"
				aria-label={t.crop}><image href={url} x="0" y="0" {width} {height} /></svg
			>
			<div class="min-w-0">
				<h3 class="font-sans text-lg font-semibold">{t.who}</h3>
				{#if named}
					<p class="flex items-center gap-1.5 text-sm font-semibold text-green-800">
						<Icon name="check" class="size-4 shrink-0" />{named}
					</p>
				{:else}
					<p class="text-sm text-muted">{t.face(number)}</p>
				{/if}
			</div>
			<!-- Removing sits in the corner, by the crop it removes, so on a phone it isn't below the whole
			     classroom's names. -->
			<button
				type="button"
				class="{button.icon} ml-auto self-start text-red-700 hover:bg-red-50 hover:text-red-800"
				aria-label={t.removeCover}
				title={t.removeCover}
				onclick={onremove}><Icon name="trash" /></button
			>
		</div>

		{#if searchable}
			<label class={field.label}>
				<span class="sr-only">{t.search}</span>
				<input class={field.input} type="search" bind:value={search} placeholder={t.search} />
			</label>
		{/if}

		<div class="flex max-h-56 flex-wrap gap-2 overflow-y-auto" role="group" aria-label={t.who}>
			{#each ordered as child (child.id)}
				<button
					type="button"
					class="{button.chip} gap-1.5"
					aria-pressed={selected.child === child.id}
					onclick={() => onassign(child.id)}
				>
					{child.name}
					{#if elsewhere.has(child.id)}
						<Icon name="check" class="size-3.5 opacity-60" /><span class="sr-only"
							>— {t.already}</span
						>
					{/if}
				</button>
			{/each}
			{#if !shown.length}<p class="text-muted">{t.empty}</p>{/if}
		</div>

		<button
			type="button"
			class="{button.secondary} justify-self-start"
			aria-pressed={selected.covered}
			onclick={() => onassign(null)}
		>
			<Icon name="eyeOff" class="size-4" />{t.covered}
		</button>

		{@render stickerChoice(selected)}
	{:else}
		<h3 class="font-sans text-lg font-semibold">{t.who}</h3>
		<p class="text-muted">{regions.length ? t.pick : t.noCovers}</p>
	{/if}
	<!-- With a few faces left over, saying they are simply not to be shown is one tap and always the safe
	     direction: it names nobody, and the photo still waits for the teacher's own review. -->
	{#if remaining > 1}
		<button type="button" class="{button.secondary} justify-self-start" onclick={oncoverrest}>
			<Icon name="eyeOff" class="size-4" />{t.coverRest(remaining)}
		</button>
	{/if}
	<p
		class={feedback ? 'flex items-center gap-2 text-sm font-semibold text-muted' : 'sr-only'}
		role="status"
	>
		{#if feedback}<Icon name="check" class="size-4 shrink-0" />{/if}{feedback}
	</p>
</div>
