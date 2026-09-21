<script lang="ts">
	import { onMount } from 'svelte';
	import type { ConsentRow } from '$lib/events/types';
	import { messages, errorMessage, type Locale } from '$lib/i18n';
	import IconTile from '$lib/components/IconTile.svelte';
	import RadioCard from './RadioCard.svelte';
	import { getApp, Task } from './state.svelte';
	import { surface, alert } from './ui';

	// Whether the families of a classroom may see a child's face in the photos of its events, decided by the
	// family, one card for each of its children. The choice is encrypted with the family's own key, so only
	// the family and staff read it, and it applies to what is published from then on.
	let { locale }: { locale: Locale } = $props();
	const app = getApp(),
		task = new Task();
	const t = $derived(messages[locale].app.events);
	const id = $props.id();
	let rows = $state<(ConsentRow & { name: string; share: boolean })[]>([]);
	let loaded = $state(false);
	let saved = $state(false);

	async function load() {
		rows = (await app.photoConsent()).map((row) => ({ ...row, name: row.name ?? t.child }));
		loaded = true;
	}
	onMount(() => {
		void task.run(load);
	});
	async function save(row: (typeof rows)[number], share: boolean) {
		if (row.share === share) return;
		saved = false;
		await task.run(async () => {
			await app.savePhotoConsent(row, share);
			await load();
			saved = true;
		});
		if (task.error === 'stale') await load();
	}
</script>

<section class={surface} aria-labelledby="{id}-title">
	<IconTile icon="smile" tone="ink" />
	<h2 id="{id}-title" class="mt-5 text-3xl">{t.consentTitle}</h2>
	<p class="mt-1 text-muted">{t.consentHint}</p>
	<div class="mt-6 grid gap-6">
		{#if task.error}<p role="alert" class={alert}>{errorMessage(locale, task.error)}</p>{/if}
		{#if loaded && !rows.length}<p class="text-muted">{t.noChildren}</p>{/if}
		{#each rows as row (row.child)}
			<fieldset class="grid gap-2">
				<legend class="mb-2 font-semibold">{row.name}</legend>
				{#each [[false, t.private, t.privateHint], [true, t.group, t.groupHint]] as const as [value, label, hint]}
					<RadioCard
						{label}
						{hint}
						name="{id}-{row.child}"
						checked={row.share === value}
						disabled={task.busy}
						onchange={() => save(row, value)}
					/>
				{/each}
			</fieldset>
		{/each}
		{#if saved && !task.error}
			<p class="font-semibold text-muted" role="status">{t.consentSaved}</p>
		{/if}
	</div>
</section>
