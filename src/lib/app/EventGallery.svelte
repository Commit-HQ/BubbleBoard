<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import type { OpenEvent } from '$lib/events/types';
	import { saveFile } from '$lib/files';
	import { formatDay, messages, type Locale } from '$lib/i18n';
	import ConfirmDialog from './ConfirmDialog.svelte';
	import { getApp } from './state.svelte';
	import { alert, button, surface } from './ui';

	// An event's gallery, as a family or a teacher opens it from the board: what it was and when, then its
	// photos one at a time. Each is decrypted and composed on this device for whoever holds this card, so they
	// come one by one rather than as a wall of thumbnails.
	let { locale, event, onremoved }: { locale: Locale; event: OpenEvent; onremoved: () => void } =
		$props();
	const app = getApp();
	const t = $derived(messages[locale].app.events);
	const p = $derived(messages[locale].app.eventEditor);
	let index = $state(0),
		url = $state(''),
		blob = $state<Blob>(),
		loading = $state(false),
		failed = $state(false),
		retry = $state(0),
		confirming = $state(false);
	const count = $derived(event.value.photos.length);
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

<div class="grid gap-5">
	<div class="{surface} grid gap-3">
		<p class="text-sm text-muted">{t.title} · {formatDay(locale, event.value.date)}</p>
		<h2 class="text-3xl">{event.value.title}</h2>
		{#if event.value.description}
			<p class="whitespace-pre-wrap">{event.value.description}</p>
		{/if}
	</div>

	{#if count > 1}
		<div class="flex flex-wrap gap-2" role="group" aria-label={p.photos}>
			{#each event.value.photos as photo, i (photo.id)}
				<button
					type="button"
					class="{button.chip} w-11"
					aria-pressed={index === i}
					aria-label={p.photo(i + 1, count)}
					onclick={() => (index = i)}>{i + 1}</button
				>
			{/each}
		</div>
	{/if}

	{#if loading}
		<p class="font-semibold text-muted" role="status">{t.loading}</p>
	{:else if failed}
		<div class="grid justify-items-start gap-3">
			<p class={alert} role="alert">{t.failed}</p>
			<button type="button" class={button.secondary} onclick={() => retry++}>
				<Icon name="refresh" class="size-4" />{t.retry}
			</button>
		</div>
	{:else if url}
		<img src={url} alt={p.photo(index + 1, count)} class="w-full rounded-3xl bg-ink/5" />
	{/if}

	<div class="flex flex-wrap gap-3">
		<button
			type="button"
			class={button.primary}
			disabled={!blob || loading}
			onclick={() => blob && saveFile(blob, `photo-${index + 1}.png`)}
		>
			<Icon name="download" class="size-4" />{t.download}
		</button>
		{#if app.canDeleteEvent(event)}
			<button type="button" class={button.danger} onclick={() => (confirming = true)}>
				<Icon name="trash" class="size-4" />{t.remove}
			</button>
		{/if}
	</div>
</div>

{#if confirming}
	<ConfirmDialog
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
	/>
{/if}
