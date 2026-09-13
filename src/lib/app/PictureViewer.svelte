<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { savePicture } from '$lib/files';
	import { errorMessage, messages, type Locale } from '$lib/i18n';
	import { onMount, tick } from 'svelte';
	import { Task, type Picture } from './state.svelte';

	// A board photo or a notice's picture on the whole screen, opened when mounted, as ConfirmDialog is. A tap
	// zooms in around where it was tapped, to read what's pinned up or written, and Save keeps the picture on
	// the device (src/lib/files.ts). `onclose` runs when it closes, by Escape or Close.
	let {
		locale,
		label,
		picture,
		name,
		onclose
	}: {
		locale: Locale;
		/** What the picture is, for the dialog's name. */
		label: string;
		picture: Picture;
		/** The name it's saved under. */
		name: string;
		onclose: () => void;
	} = $props();

	const t = $derived(messages[locale].app.viewer);
	const task = new Task();
	let dialog = $state<HTMLDialogElement>();
	let frame = $state<HTMLDivElement>();
	let zoomed = $state(false);
	onMount(() => dialog?.showModal());

	/** Shows the picture at its full size around the point tapped, or fits it to the screen again. */
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

<dialog
	bind:this={dialog}
	class="m-0 size-full max-h-none max-w-none bg-ink p-0 backdrop:bg-ink"
	aria-label={label}
	{onclose}
>
	<div bind:this={frame} class="size-full overflow-auto">
		<button
			class="grid min-h-full min-w-full place-items-center {zoomed
				? 'cursor-zoom-out'
				: 'cursor-zoom-in'}"
			type="button"
			aria-label={zoomed ? t.fit : t.zoom}
			onclick={zoom}
		>
			<img
				src={picture.url}
				alt=""
				class={zoomed ? 'max-w-none' : 'max-h-dvh max-w-full object-contain'}
			/>
		</button>
	</div>
	<button
		class="fixed top-4 right-4 grid size-11 place-items-center rounded-full frosted text-ink"
		type="button"
		aria-label={t.close}
		onclick={() => dialog?.close()}
	>
		<Icon name="x" />
	</button>
	<!-- At the bottom, within a thumb's reach, leaving taps beside it to the picture. -->
	<div
		class="pointer-events-none fixed inset-x-4 bottom-6 grid justify-items-center gap-2 *:pointer-events-auto"
	>
		{#if task.error}
			<p class="rounded-2xl bg-white px-4 py-3 text-center font-semibold text-red-800" role="alert">
				{errorMessage(locale, task.error)}
			</p>
		{/if}
		<button
			class="inline-flex min-h-11 items-center gap-2 rounded-full frosted px-5 font-semibold text-ink transition disabled:opacity-50"
			type="button"
			disabled={task.busy}
			onclick={() => task.run(() => savePicture(picture.blob, name))}
		>
			<Icon name="download" class="size-4" />{t.save}
		</button>
	</div>
</dialog>
