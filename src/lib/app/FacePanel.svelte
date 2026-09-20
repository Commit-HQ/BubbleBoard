<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import type { Region } from '$lib/events/editor';
	import { stickers, type Sticker } from '$lib/events/stickers';
	import { messages, type Locale } from '$lib/i18n';
	import { untrack } from 'svelte';
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
		feedback,
		onassign,
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
		/** What just happened, said once for everyone rather than only for screen readers. */
		feedback: string;
		onassign: (child: string | null) => void;
		onremove: () => void;
		onsticker: (sticker: Sticker) => void;
	} = $props();

	const t = $derived(messages[locale].app.eventEditor);
	let search = $state('');
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
	// A new face starts with an empty search, so the whole classroom is there again. Moving or restyling the
	// same cover leaves what was typed alone.
	let searched = $state(untrack(() => selected?.id));
	$effect(() => {
		if (selected?.id !== searched) {
			searched = selected?.id;
			search = '';
		}
	});
</script>

<div class="grid gap-4 rounded-3xl glass p-5">
	{#if selected}
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
		</div>

		{#if searchable}
			<label class={field.label}>
				<span class="sr-only">{t.search}</span>
				<input class={field.input} type="search" bind:value={search} placeholder={t.search} />
			</label>
		{/if}

		<div class="flex max-h-56 flex-wrap gap-2 overflow-y-auto" role="group" aria-label={t.who}>
			{#each shown as child (child.id)}
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

		<div class="flex flex-wrap items-center gap-2">
			<button
				type="button"
				class={button.secondary}
				aria-pressed={selected.covered}
				onclick={() => onassign(null)}
			>
				<Icon name="eyeOff" class="size-4" />{t.covered}
			</button>
			<button type="button" class="{button.danger} ml-auto" onclick={onremove}>
				<Icon name="trash" class="size-4" />{t.removeCover}
			</button>
		</div>

		<div class="flex flex-wrap items-center gap-2" role="group" aria-label={t.sticker}>
			<span class="text-sm font-semibold text-muted">{t.sticker}</span>
			{#each Object.entries(stickers) as [name, source] (name)}
				<!-- A ring marks the chosen sticker, which forced colours would otherwise flatten. -->
				<button
					type="button"
					class="grid size-11 place-items-center rounded-full ring-1 ring-ink/10 transition hover:bg-ink/5 aria-pressed:ring-3 aria-pressed:ring-accent"
					aria-label={t.stickerNames[name as Sticker]}
					title={t.stickerNames[name as Sticker]}
					aria-pressed={(selected.sticker ?? 'smile') === name}
					onclick={() => onsticker(name as Sticker)}
				>
					<img src={source} alt="" class="size-7" />
				</button>
			{/each}
		</div>
	{:else}
		<h3 class="font-sans text-lg font-semibold">{t.who}</h3>
		<p class="text-muted">{regions.length ? t.pick : t.noCovers}</p>
	{/if}
	<p
		class={feedback ? 'flex items-center gap-2 text-sm font-semibold text-muted' : 'sr-only'}
		role="status"
	>
		{#if feedback}<Icon name="check" class="size-4 shrink-0" />{/if}{feedback}
	</p>
</div>
