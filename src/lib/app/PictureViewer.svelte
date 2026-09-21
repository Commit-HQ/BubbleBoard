<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { savePicture } from '$lib/files';
	import { errorMessage, messages, type Locale } from '$lib/i18n';
	import { onMount, tick } from 'svelte';
	import { Task, type Picture } from './state.svelte';
	import { button } from './ui';

	// A board photo, a notice's picture or an event's photo on the whole screen, opened when mounted, as
	// ConfirmDialog is. A tap zooms in around where it was tapped, to read what's pinned up or written, and
	// Save keeps the picture on the device (src/lib/files.ts). With `gallery`, the photo is one of a set: a
	// swipe, the arrows, or the arrow keys move through it, and its number and the teacher's words show under
	// it. `onclose` runs when it closes, by Escape or Close.
	let {
		locale,
		label,
		picture,
		name,
		caption,
		gallery,
		onclose
	}: {
		locale: Locale;
		/** What the picture is, for the dialog's name. */
		label: string;
		/** The picture, or nothing while the next one of a gallery is being opened. */
		picture?: Picture;
		/** The name it's saved under. */
		name: string;
		/** The few words written under the photo, where there are any. */
		caption?: string;
		/** Where this picture is in a set, and how to move through it. */
		gallery?: { index: number; count: number; onmove: (step: number) => void };
		onclose: () => void;
	} = $props();

	const t = $derived(messages[locale].app.viewer);
	const task = new Task();
	let dialog = $state<HTMLDialogElement>();
	let frame = $state<HTMLDivElement>();
	let zoomed = $state(false);
	/** Where a one-finger drag started, while it could still turn out to be a swipe between photos. */
	let swipe: { x: number; y: number } | undefined;
	let swiped = false;
	onMount(() => dialog?.showModal());

	// A photo that has just been swiped to opens fitted to the screen, whatever the one before was.
	$effect(() => {
		void gallery?.index;
		zoomed = false;
	});

	function move(step: number) {
		if (!gallery) return;
		const next = gallery.index + step;
		if (next >= 0 && next < gallery.count) gallery.onmove(step);
	}

	/** Shows the picture at its full size around the point tapped, or fits it to the screen again. */
	async function zoom(event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }) {
		// The tap that ends a swipe between photos belongs to the swipe, not to zooming in.
		if (swiped) {
			swiped = false;
			return;
		}
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

	function start(event: PointerEvent) {
		swiped = false;
		swipe = gallery && !zoomed ? { x: event.clientX, y: event.clientY } : undefined;
	}

	/** A firm sideways drag moves to the photo beside this one; a small one leaves it alone. */
	function end(event: PointerEvent) {
		const from = swipe;
		swipe = undefined;
		if (!from) return;
		const [x, y] = [event.clientX - from.x, event.clientY - from.y];
		if (Math.abs(x) < 60 || Math.abs(x) < Math.abs(y)) return;
		swiped = true;
		move(x < 0 ? 1 : -1);
	}
</script>

<dialog
	bind:this={dialog}
	class="m-0 size-full max-h-none max-w-none bg-ink p-0 backdrop:bg-ink"
	aria-label={label}
	onkeydown={(event) => {
		if (event.key === 'ArrowRight') move(1);
		else if (event.key === 'ArrowLeft') move(-1);
	}}
	{onclose}
>
	<div bind:this={frame} class="size-full overflow-auto">
		<button
			class="grid min-h-full min-w-full place-items-center {zoomed
				? 'cursor-zoom-out'
				: 'cursor-zoom-in'} {gallery && !zoomed ? 'touch-pan-y' : ''}"
			type="button"
			aria-label={zoomed ? t.fit : t.zoom}
			onpointerdown={start}
			onpointerup={end}
			onpointercancel={() => (swipe = undefined)}
			onclick={zoom}
		>
			{#if picture}
				<img
					src={picture.url}
					alt=""
					class={zoomed ? 'max-w-none' : 'max-h-dvh max-w-full object-contain'}
				/>
			{:else}
				<span class="font-semibold text-white/80" role="status">{t.opening}</span>
			{/if}
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
		{#if caption}
			<p class="max-w-prose rounded-2xl frosted px-4 py-2 text-center text-ink">{caption}</p>
		{/if}
		<div class="flex flex-wrap items-center justify-center gap-2">
			{#if gallery}
				<button
					class="grid size-11 place-items-center rounded-full frosted text-ink disabled:opacity-40"
					type="button"
					aria-label={t.previous}
					disabled={gallery.index === 0}
					onclick={() => move(-1)}
				>
					<Icon name="chevronLeft" />
				</button>
				<span class="rounded-full frosted px-4 py-2 text-sm font-semibold text-ink">
					{gallery.index + 1} / {gallery.count}
				</span>
				<button
					class="grid size-11 place-items-center rounded-full frosted text-ink disabled:opacity-40"
					type="button"
					aria-label={t.next}
					disabled={gallery.index + 1 === gallery.count}
					onclick={() => move(1)}
				>
					<Icon name="chevronRight" />
				</button>
			{/if}
			<button
				class={button.frosted}
				type="button"
				disabled={task.busy || !picture}
				onclick={() => picture && task.run(() => savePicture(picture.blob, name))}
			>
				<Icon name="download" class="size-4" />{t.save}
			</button>
		</div>
	</div>
</dialog>
