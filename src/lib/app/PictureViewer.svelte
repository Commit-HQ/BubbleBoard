<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { canSharePicture, savePicture, sharePicture } from '$lib/files';
	import { errorMessage, messages, type Locale } from '$lib/i18n';
	import { onMount } from 'svelte';
	import { Task, type Picture } from './state.svelte';
	import { button } from './ui';

	// A board photo, a notice's picture or an event's photo on the whole screen, opened when mounted, as
	// ConfirmDialog is. Two fingers or a double tap zoom in on a phone, and the buttons in the corner or the wheel do where
	// there's a mouse, to read what's pinned up or written; a zoomed picture is dragged about. Save keeps the
	// picture on the device (src/lib/files.ts). With `gallery`, the photo is one of a set: a
	// swipe, the arrows, or the arrow keys move through it, and its number and the teacher's words show under
	// it. `onclose` runs when it closes, by Escape or Close.
	let {
		locale,
		label,
		picture,
		name,
		number,
		caption,
		gallery,
		onclose
	}: {
		locale: Locale;
		/** What the picture is, for the dialog's name. */
		label: string;
		/** The picture, or nothing while the next one of a gallery is being opened. */
		picture?: Picture;
		/** The name it's saved under, which one of a gallery is numbered after. */
		name: string;
		/** Which photo of a set this is, when the name it's saved under is numbered. */
		number?: number;
		/** The few words written under the photo, where there are any. */
		caption?: string;
		/** Where this picture is in a set, and how to move through it. */
		gallery?: { index: number; count: number; onmove: (step: number) => void };
		onclose: () => void;
	} = $props();

	const t = $derived(messages[locale].app.viewer);
	/** Which photo of a gallery this is, so a set saved one by one keeps them apart. */
	const suffix = $derived(number ? `-${number}` : '');
	// Sharing hands over the very file Save writes, so it shows nothing a family couldn't already keep. On
	// iPhone and iPad Save opens the share sheet itself, so there is no second button there.
	const shareable = canSharePicture();
	const task = new Task();
	let dialog = $state<HTMLDialogElement>();
	let frame = $state<HTMLDivElement>();
	let image = $state<HTMLImageElement>();
	type Point = { x: number; y: number };
	/** How much larger than fitted to the screen the picture shows, and how far it's moved off the middle. */
	let scale = $state(1);
	let offset = $state<Point>({ x: 0, y: 0 });
	/** The most the picture zooms in: to its own pixels, and four times at least. */
	let most = $state(4);
	/** A step from a button or a key glides; fingers, the mouse and the wheel move the picture themselves. */
	let smooth = $state(false);
	const pointers = new Map<number, Point>();
	/** The bit of picture under the fingers or the mouse when they took hold, which stays under them. */
	let hold: { anchor: Point; scale: number; distance: number } | undefined;
	/** Where a one-finger drag started, while it could still turn out to be a swipe between photos. */
	let swipe: Point | undefined;
	/** Where and when the one finger down now landed, and the tap before it, which a second one makes a double tap. */
	let pressed: (Point & { time: number }) | undefined;
	let tapped: (Point & { time: number }) | undefined;
	onMount(() => dialog?.showModal());

	// A photo that has just been swiped to opens fitted to the screen, whatever the one before was.
	$effect(() => {
		void gallery?.index;
		scale = 1;
		offset = { x: 0, y: 0 };
	});

	function move(step: number) {
		if (!gallery) return;
		const next = gallery.index + step;
		if (next >= 0 && next < gallery.count) gallery.onmove(step);
	}

	/** A point of the screen, measured from the middle of the frame as `offset` is. */
	function centred(x: number, y: number): Point {
		const box = frame!.getBoundingClientRect();
		return { x: x - box.left - box.width / 2, y: y - box.top - box.height / 2 };
	}

	/** The bit of the fitted picture that shows at a point of the screen. */
	function under(at: Point): Point {
		return { x: (at.x - offset.x) / scale, y: (at.y - offset.y) / scale };
	}

	/** Zooms so that `anchor` shows at `at`, never moving the picture's edge inside the screen's. */
	function place(next: number, at: Point, anchor = under(at)) {
		if (!frame || !image) return;
		most = Math.max(4, image.naturalWidth / image.clientWidth);
		scale = Math.max(1, Math.min(most, next));
		const within = (wanted: number, shown: number, room: number) => {
			const reach = Math.max(0, (shown * scale - room) / 2);
			return Math.max(-reach, Math.min(reach, wanted));
		};
		offset = {
			x: within(at.x - anchor.x * scale, image.clientWidth, frame.clientWidth),
			y: within(at.y - anchor.y * scale, image.clientHeight, frame.clientHeight)
		};
	}

	/** A step in or out around the middle of the screen, from a button or a key. */
	function step(factor: number) {
		smooth = true;
		place(scale * factor, { x: 0, y: 0 });
	}

	function middle(): Point {
		const all = [...pointers.values()];
		return centred(
			all.reduce((sum, point) => sum + point.x, 0) / all.length,
			all.reduce((sum, point) => sum + point.y, 0) / all.length
		);
	}

	function distance() {
		const [a, b] = [...pointers.values()];
		return b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
	}

	/** Takes hold of the picture with the fingers now on it, so lifting one of two carries on as a drag. */
	function grab() {
		hold = pointers.size ? { anchor: under(middle()), scale, distance: distance() } : undefined;
	}

	function down(event: PointerEvent) {
		smooth = false;
		pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
		frame?.setPointerCapture(event.pointerId);
		pressed =
			pointers.size === 1
				? { x: event.clientX, y: event.clientY, time: event.timeStamp }
				: undefined;
		swipe =
			gallery && scale === 1 && pointers.size === 1
				? { x: event.clientX, y: event.clientY }
				: undefined;
		grab();
	}

	function drag(event: PointerEvent) {
		if (!hold || !pointers.has(event.pointerId)) return;
		pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
		place(hold.distance ? (hold.scale * distance()) / hold.distance : scale, middle(), hold.anchor);
	}

	/** A firm sideways drag of a fitted photo moves to the one beside it; a small one leaves it alone. */
	function up(event: PointerEvent) {
		pointers.delete(event.pointerId);
		grab();
		const from = swipe;
		swipe = undefined;
		if (event.type === 'pointercancel') return;
		if (tap(event)) return;
		if (!from) return;
		const [x, y] = [event.clientX - from.x, event.clientY - from.y];
		if (Math.abs(x) < 60 || Math.abs(x) < Math.abs(y)) return;
		move(x < 0 ? 1 : -1);
	}

	/** A second quick tap on the same spot zooms in around it, or fits a zoomed picture to the screen again. */
	function tap(event: PointerEvent) {
		const near = (from: Point & { time: number }, within: number) =>
			event.timeStamp - from.time < within &&
			Math.hypot(event.clientX - from.x, event.clientY - from.y) < 24;
		const down = pressed;
		pressed = undefined;
		if (!down || !near(down, 300)) return false;
		const double = tapped && near(tapped, 500);
		tapped = double ? undefined : down;
		if (!double) return true;
		smooth = true;
		if (scale > 1) place(1, { x: 0, y: 0 });
		else place(2.5, centred(event.clientX, event.clientY));
		return true;
	}

	/** The wheel zooms around the mouse, as does a pinch on a trackpad, which arrives as a finer wheel. */
	function wheel(event: WheelEvent) {
		event.preventDefault();
		smooth = false;
		place(
			scale * Math.exp(-event.deltaY / (event.ctrlKey ? 100 : 300)),
			centred(event.clientX, event.clientY)
		);
	}
</script>

<dialog
	bind:this={dialog}
	class="m-0 size-full max-h-none max-w-none bg-ink p-0 backdrop:bg-ink"
	aria-label={label}
	onkeydown={(event) => {
		if (event.key === 'ArrowRight') move(1);
		else if (event.key === 'ArrowLeft') move(-1);
		else if (event.key === '+' || event.key === '=') step(1.5);
		else if (event.key === '-') step(1 / 1.5);
	}}
	{onclose}
>
	<!-- The page neither scrolls nor zooms under the fingers here: they move the picture alone. -->
	<div
		bind:this={frame}
		role="presentation"
		class="grid size-full touch-none place-items-center overflow-hidden select-none {scale > 1
			? 'cursor-grab active:cursor-grabbing'
			: ''}"
		onpointerdown={down}
		onpointermove={drag}
		onpointerup={up}
		onpointercancel={up}
		onwheel={wheel}
	>
		{#if picture}
			<img
				bind:this={image}
				src={picture.url}
				alt=""
				draggable="false"
				class="max-h-dvh max-w-full object-contain {smooth
					? 'transition-transform duration-150 motion-reduce:transition-none'
					: ''}"
				style:transform="translate({offset.x}px, {offset.y}px) scale({scale})"
			/>
		{:else}
			<span class="font-semibold text-white/80" role="status">{t.opening}</span>
		{/if}
	</div>
	<!-- A phone zooms with two fingers on the picture itself, so the buttons are only where there's a mouse. -->
	<div class="fixed top-4 left-4 hidden gap-2 pointer-fine:flex">
		<button
			class="grid size-11 place-items-center rounded-full frosted text-ink disabled:opacity-40"
			type="button"
			aria-label={t.zoomOut}
			disabled={scale === 1}
			onclick={() => step(1 / 1.5)}
		>
			<Icon name="minus" />
		</button>
		<button
			class="grid size-11 place-items-center rounded-full frosted text-ink disabled:opacity-40"
			type="button"
			aria-label={t.zoom}
			disabled={scale >= most}
			onclick={() => step(1.5)}
		>
			<Icon name="plus" />
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
	<!-- At the bottom, within a thumb's reach, leaving the picture beside it to the fingers. -->
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
				onclick={() => picture && task.run(() => savePicture(picture.blob, name, suffix))}
			>
				<Icon name="download" class="size-4" />{t.save}
			</button>
			{#if shareable}
				<button
					class={button.frosted}
					type="button"
					disabled={task.busy || !picture}
					onclick={() => picture && task.run(() => sharePicture(picture.blob, name, suffix))}
				>
					<Icon name="share" class="size-4" />{t.share}
				</button>
			{/if}
		</div>
	</div>
</dialog>
