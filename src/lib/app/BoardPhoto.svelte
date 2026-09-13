<script lang="ts">
	import type { PhotoRecord } from '$lib/api';
	import Icon from '$lib/components/Icon.svelte';
	import { errorCode } from '$lib/errors';
	import { errorMessage, messages, type Locale } from '$lib/i18n';
	import { appPath } from '$lib/paths';
	import { tick } from 'svelte';
	import ConfirmDialog from './ConfirmDialog.svelte';
	import { getApp } from './state.svelte';
	import { button } from './ui';

	// The photo of a classroom's corkboard, as it looks now. A tap opens it on the whole screen, where a tap
	// zooms in to read what's pinned up; the classroom's teachers put a new one up or take it down.
	let { locale, photo }: { locale: Locale; photo: PhotoRecord } = $props();
	const app = getApp();
	const t = $derived(messages[locale].app.photos);
	const classroom = $derived(app.myClassrooms.find(({ id }) => id === photo.classroom)?.name ?? '');
	const posted = $derived(
		new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(photo.postedAt)
	);
	const image = $derived(app.photoUrl(photo));
	let viewer = $state<HTMLDialogElement>();
	let frame = $state<HTMLDivElement>();
	let zoomed = $state(false);
	let removing = $state(false);

	/** Shows the photo at its full size around the point tapped, or fits it to the screen again. */
	async function zoom(event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }) {
		const shown = event.currentTarget.querySelector('img');
		if (!shown || !frame) return;
		const { left, top, width, height } = shown.getBoundingClientRect();
		const [x, y] = [(event.clientX - left) / width, (event.clientY - top) / height];
		zoomed = !zoomed;
		if (!zoomed) return;
		await tick();
		frame.scrollTo(
			x * shown.naturalWidth - frame.clientWidth / 2,
			y * shown.naturalHeight - frame.clientHeight / 2
		);
	}
</script>

<figure class="overflow-hidden rounded-3xl glass">
	{#await image}
		<p
			class="grid aspect-4/3 place-items-center bg-ink/5 text-sm font-semibold text-muted"
			role="status"
		>
			{t.loading}
		</p>
	{:then src}
		<button
			class="block w-full cursor-zoom-in"
			type="button"
			aria-label={t.open(classroom)}
			onclick={() => viewer?.showModal()}
		>
			<img {src} alt="" class="aspect-4/3 w-full object-cover" />
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
			<span class="font-semibold">{classroom}</span>
			<span class="text-muted">· {t.posted(posted)}</span>
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

<dialog
	bind:this={viewer}
	class="m-0 size-full max-h-none max-w-none bg-ink p-0 backdrop:bg-ink"
	aria-label={t.open(classroom)}
	onclose={() => (zoomed = false)}
>
	{#await image then src}
		<div bind:this={frame} class="size-full overflow-auto">
			<button
				class="grid min-h-full min-w-full place-items-center {zoomed
					? 'cursor-zoom-out'
					: 'cursor-zoom-in'}"
				type="button"
				aria-label={zoomed ? t.fit : t.zoom}
				onclick={zoom}
			>
				<img {src} alt="" class={zoomed ? 'max-w-none' : 'max-h-dvh max-w-full object-contain'} />
			</button>
		</div>
	{/await}
	<button
		class="fixed top-4 right-4 grid size-11 place-items-center rounded-full frosted text-ink"
		type="button"
		aria-label={t.close}
		onclick={() => viewer?.close()}
	>
		<Icon name="x" />
	</button>
</dialog>

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
