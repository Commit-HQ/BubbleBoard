<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { errorCode } from '$lib/errors';
	import { errorMessage, formatDateTime, messages, type Locale } from '$lib/i18n';
	import { appPath } from '$lib/paths';
	import type { Photo } from '$lib/photos';
	import ConfirmDialog from './ConfirmDialog.svelte';
	import PictureViewer from './PictureViewer.svelte';
	import { getApp } from './state.svelte';
	import { button } from './ui';

	// The photo of a classroom's corkboard, as it looks now, captioned as the notice board's photo, with its
	// classroom and who put it up and when, as a notice says it. A tap opens it on the whole screen, to zoom in
	// on what's pinned up or save it; the classroom's teachers put a new one up or take it down.
	let { locale, photo }: { locale: Locale; photo: Photo } = $props();
	const app = getApp();
	const t = $derived(messages[locale].app.photos);
	const classroom = $derived(app.myClassrooms.find(({ id }) => id === photo.classroom)?.name ?? '');
	const details = $derived(
		[classroom, photo.author, formatDateTime(locale, photo.postedAt)].filter(Boolean).join(' · ')
	);
	const picture = $derived(app.photoPicture(photo));
	let viewing = $state(false);
	let removing = $state(false);
</script>

<figure class="overflow-hidden rounded-3xl glass">
	{#await picture}
		<p
			class="grid aspect-4/3 place-items-center bg-ink/5 text-sm font-semibold text-muted"
			role="status"
		>
			{t.loading}
		</p>
	{:then { url }}
		<button
			class="block w-full cursor-zoom-in"
			type="button"
			aria-label={t.open(classroom)}
			onclick={() => (viewing = true)}
		>
			<img src={url} alt="" class="aspect-4/3 w-full object-cover" />
		</button>
	{:catch cause}
		<p
			class="grid aspect-4/3 place-items-center bg-ink/5 px-6 text-center text-sm font-semibold text-muted"
			role="alert"
		>
			{errorMessage(locale, errorCode(cause))}
		</p>
	{/await}
	<figcaption class="flex items-center justify-between gap-3 py-1.5 pr-1.5 pl-5 text-sm">
		<span class="min-w-0 py-2">
			<span class="block font-semibold">{t.photo}</span>
			<span class="block text-muted">{details}</span>
		</span>
		{#if app.status === 'staff'}
			<span class="flex shrink-0">
				<a
					class={button.icon}
					href={appPath(locale, 'photo', { classroom: photo.classroom })}
					aria-label={t.replace}
					title={t.replace}
				>
					<Icon name="camera" class="size-4" />
				</a>
				<button
					class={button.icon}
					type="button"
					aria-label={t.remove}
					title={t.remove}
					onclick={() => (removing = true)}
				>
					<Icon name="trash" class="size-4" />
				</button>
			</span>
		{/if}
	</figcaption>
</figure>

{#if viewing}
	{#await picture then shown}
		<PictureViewer
			{locale}
			label={t.open(classroom)}
			picture={shown}
			name="{classroom}.jpg"
			onclose={() => (viewing = false)}
		/>
	{/await}
{/if}

{#if removing}
	<ConfirmDialog
		{locale}
		title={t.removeTitle}
		copy={t.removeCopy}
		confirmLabel={t.remove}
		danger
		onconfirm={() => app.takeDownPhoto(photo)}
		onclose={() => (removing = false)}
	/>
{/if}
