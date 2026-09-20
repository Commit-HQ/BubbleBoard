<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import type { OpenEvent } from '$lib/events/types';
	import { savePicture } from '$lib/files';
	import { errorMessage, formatDay, messages, type Locale } from '$lib/i18n';
	import ConfirmDialog from './ConfirmDialog.svelte';
	import NoticeBody from './NoticeBody.svelte';
	import PictureViewer from './PictureViewer.svelte';
	import { getApp, Task, type Picture } from './state.svelte';
	import { alert, button, surface } from './ui';

	// An event's gallery, as a family or a teacher opens it from the board: what it was and when, then its
	// photos one at a time, with the teacher's words under each. Each photo is decrypted and composed on this
	// device for whoever holds this card, so they come one by one rather than as a wall of thumbnails. A tap
	// opens the photo on the whole screen, where a swipe moves through the gallery.
	let { locale, event, onremoved }: { locale: Locale; event: OpenEvent; onremoved: () => void } =
		$props();
	const app = getApp();
	const task = new Task();
	const t = $derived(messages[locale].app.events);
	const p = $derived(messages[locale].app.eventEditor);
	let index = $state(0),
		picture = $state.raw<Picture>(),
		loading = $state(false),
		failed = $state(false),
		retry = $state(0),
		viewing = $state(false),
		confirming = $state(false);
	const photos = $derived(event.value.photos);
	const shown = $derived(photos[index]);
	$effect(() => {
		const photo = photos[index];
		const generation = retry;
		void generation;
		let cancelled = false,
			created = '';
		loading = true;
		failed = false;
		picture = undefined;
		app
			.eventPicture(event, photo.id)
			.then((blob) => {
				if (cancelled) return;
				created = URL.createObjectURL(blob);
				picture = { blob, url: created };
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

	function move(step: number) {
		index = Math.max(0, Math.min(photos.length - 1, index + step));
	}
	function save() {
		const saving = picture;
		if (saving) task.run(() => savePicture(saving.blob, name(index)));
	}
	/** What a saved photo is called on the device: the event and which photo of it this is. */
	function name(position: number) {
		return `${event.value.title}-${position + 1}.png`;
	}
</script>

<div class="grid gap-5">
	<div class="{surface} grid gap-3">
		<p class="text-sm text-muted">{t.title} · {formatDay(locale, event.value.date)}</p>
		<h2 class="text-3xl">{event.value.title}</h2>
		{#if event.value.description.content.length}
			<NoticeBody blocks={event.value.description.content} />
		{/if}
	</div>

	{#if photos.length > 1}
		<div class="flex flex-wrap gap-2" role="group" aria-label={p.photos}>
			{#each photos as photo, i (photo.id)}
				<button
					type="button"
					class="{button.chip} w-11"
					aria-pressed={index === i}
					aria-label={p.photo(i + 1, photos.length)}
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
	{:else if picture}
		<figure class="grid gap-2">
			<button
				type="button"
				class="block cursor-zoom-in rounded-3xl"
				aria-label={p.photo(index + 1, photos.length)}
				onclick={() => (viewing = true)}
			>
				<img src={picture.url} alt="" class="w-full rounded-3xl bg-ink/5" />
			</button>
			{#if shown.text}<figcaption class="text-muted">{shown.text}</figcaption>{/if}
		</figure>
	{/if}

	{#if task.error}<p class={alert} role="alert">{errorMessage(locale, task.error)}</p>{/if}
	<div class="flex flex-wrap gap-3">
		<button
			type="button"
			class={button.primary}
			disabled={!picture || task.busy}
			onclick={() => save()}
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

{#if viewing}
	<PictureViewer
		{locale}
		label={`${event.value.title} — ${p.photo(index + 1, photos.length)}`}
		{picture}
		name={name(index)}
		caption={shown.text}
		gallery={{ index, count: photos.length, onmove: move }}
		onclose={() => (viewing = false)}
	/>
{/if}

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
