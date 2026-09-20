<script lang="ts">
	import { messages, type Locale } from '$lib/i18n';
	import type { OpenEvent } from '$lib/events/types';
	import { saveFile } from '$lib/files';
	import { getApp } from './state.svelte';
	import { alert, button } from './ui';
	import ConfirmDialog from './ConfirmDialog.svelte';
	let { locale, event, onremoved }: { locale: Locale; event: OpenEvent; onremoved: () => void } =
		$props();
	const app = getApp();
	const t = $derived(messages[locale].app.events);
	let index = $state(0),
		url = $state(''),
		blob = $state<Blob>(),
		loading = $state(false),
		failed = $state(false),
		retry = $state(0),
		confirming = $state(false);
	$effect(() => {
		const photo = event.value.photos[index];
		const generation = retry;
		void generation;
		let cancelled = false,
			created = '';
		loading = true;
		failed = false;
		url = '';
		blob = undefined;
		app
			.eventPicture(event, photo.id)
			.then((result) => {
				if (cancelled) return;
				blob = result;
				created = URL.createObjectURL(result);
				url = created;
			})
			.catch(() => {
				if (!cancelled) failed = true;
			})
			.finally(() => {
				if (!cancelled) loading = false;
			});
		return () => {
			cancelled = true;
			if (created) URL.revokeObjectURL(created);
		};
	});
</script>

<div class="grid gap-4">
	<h2 class="text-3xl">{event.value.title}</h2>
	<p class="text-sm text-muted">{event.value.date}</p>
	<p class="whitespace-pre-wrap">{event.value.description}</p>
	<div class="flex flex-wrap gap-2">
		{#each event.value.photos as photo, i}<button
				type="button"
				class={button.chip}
				aria-pressed={index === i}
				onclick={() => (index = i)}>{i + 1}</button
			>{/each}
	</div>
	{#if loading}<p role="status">{messages[locale].app.eventEditor.loading}</p>{:else if failed}<p
			class={alert}
		>
			{t.failed}
		</p>
		<button class={button.secondary} onclick={() => retry++}>{t.retry}</button>{:else if url}<img
			src={url}
			alt={`${event.value.title} — ${index + 1}`}
			class="w-full rounded-2xl"
		/>{/if}
	<div class="flex flex-wrap gap-2">
		<button
			type="button"
			class={button.primary}
			disabled={!blob || loading}
			onclick={() => blob && saveFile(blob, `photo-${index + 1}.png`)}>{t.download}</button
		>
		{#if app.canDeleteEvent(event)}<button class={button.danger} onclick={() => (confirming = true)}
				>{t.remove}</button
			>{/if}
	</div>
</div>
{#if confirming}<ConfirmDialog
		{locale}
		title={t.remove}
		copy={t.removeHint}
		confirmLabel={t.remove}
		danger
		onconfirm={async () => {
			await app.deleteEvent(event);
			confirming = false;
			onremoved();
		}}
		onclose={() => (confirming = false)}
	/>{/if}
