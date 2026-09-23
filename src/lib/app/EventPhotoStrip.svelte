<script module lang="ts">
	import type { History } from '$lib/events/editor';
	/**
	 * One photo of the gallery as the strip shows it, which the editor puts together in its order: one being
	 * prepared now, with what's marked on it, or one already up. Nothing about that one can be reviewed, so it
	 * shows a lock instead, and it has no picture while it's still opening.
	 */
	export type Thumb =
		| { id: string; url: string; published?: false; history: History; detection: string }
		| { id: string; url?: string; published: true };
</script>

<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { unresolved } from '$lib/events/editor';
	import { messages, type Locale } from '$lib/i18n';

	// Every photo of the gallery in one row, in the order families will see them, with what each still needs:
	// a tick when it's reviewed, how many faces are waiting, a dot while the faces are being looked for, or a
	// lock on one that's already up and can only be moved, reworded or taken off. Tapping one opens it, losing
	// no work. A photo can also be dragged to another place: with a mouse the drag starts once it has moved a
	// little, and with a finger only after a press that stays still, because until then the finger belongs to
	// scrolling the strip. The buttons beside the photo itself do the same thing without dragging, which is
	// what a keyboard and a screen reader use, so this is only ever an easier way to do it.
	let {
		locale,
		photos,
		current,
		onpick,
		onmove
	}: {
		locale: Locale;
		photos: Thumb[];
		current: string;
		onpick: (id: string) => void;
		onmove: (id: string, to: number) => void;
	} = $props();

	const t = $derived(messages[locale].app.eventEditor);

	/** How far a finger may stray before a press is a scroll, how long it must stay, and how near the edge
	 * the pointer slides the strip along. */
	const stray = 10,
		press = 350,
		margin = 48;
	let list = $state<HTMLElement>();
	/** The photo being dragged, and where it was when the drag started, so Escape can put it back. */
	let dragging = $state('');
	let from = 0;
	/** The photo under the pointer since it went down, while it may still turn into a drag. */
	let held = '',
		fromX = 0,
		fromY = 0,
		pointer = 0,
		thumb: HTMLElement | undefined;
	/** Whether the pointer that is now lifting dragged something, so its click doesn't also open a photo. */
	let moved = false;
	let pressing: ReturnType<typeof setTimeout>;
	/** How fast the strip slides while the pointer is held near one of its ends, and the frame doing it. */
	let edge = 0,
		sliding: number | undefined;

	function waiting({ history }: { history: History }) {
		return history.present.reviewed ? 0 : unresolved(history.present);
	}
	function status(item: Thumb) {
		if (item.published) return t.published;
		if (item.detection === 'pending') return t.detecting;
		if (item.history.present.reviewed) return t.reviewed;
		const left = unresolved(item.history.present);
		return left ? t.remaining(left) : t.reviewNeeded;
	}
	/** Which place in the row the pointer is over: the first thumb whose middle it hasn't passed. */
	function placeAt(x: number) {
		const thumbs = [...(list?.children ?? [])] as HTMLElement[];
		const at = thumbs.findIndex((item) => {
			const box = item.getBoundingClientRect();
			return x < box.left + box.width / 2;
		});
		return at < 0 ? thumbs.length - 1 : at;
	}
	function begin() {
		clearTimeout(pressing);
		if (!held) return;
		dragging = held;
		from = photos.findIndex((item) => item.id === held);
		moved = true;
		try {
			thumb?.setPointerCapture(pointer);
		} catch {
			/* A pointer that has already gone keeps the drag on the page instead. */
		}
		slide();
	}
	function slide() {
		sliding = requestAnimationFrame(slide);
		if (edge && list) list.scrollLeft += edge;
	}
	function end(keep: boolean) {
		clearTimeout(pressing);
		if (dragging && !keep) onmove(dragging, from);
		if (thumb?.hasPointerCapture(pointer)) thumb.releasePointerCapture(pointer);
		if (sliding !== undefined) cancelAnimationFrame(sliding);
		sliding = undefined;
		dragging = '';
		held = '';
		edge = 0;
	}
	function down(event: PointerEvent, id: string) {
		moved = false;
		held = id;
		fromX = event.clientX;
		fromY = event.clientY;
		pointer = event.pointerId;
		thumb = event.currentTarget as HTMLElement;
		// A finger belongs to scrolling the strip until it has stayed in one place long enough to mean a move.
		if (event.pointerType === 'touch') pressing = setTimeout(begin, press);
	}
	function track(event: PointerEvent) {
		const far = Math.hypot(event.clientX - fromX, event.clientY - fromY);
		if (!dragging) {
			if (!held) return;
			// A mouse or a pen says what it means by moving; a finger that moves this soon was scrolling.
			if (event.pointerType === 'touch') {
				if (far > stray) end(true);
				return;
			}
			if (far <= 5) return;
			begin();
		}
		const box = list!.getBoundingClientRect();
		edge = event.clientX < box.left + margin ? -12 : event.clientX > box.right - margin ? 12 : 0;
		const to = placeAt(event.clientX);
		if (photos[to]?.id !== dragging) onmove(dragging, to);
	}
	// Dragging a thumb must not also scroll the strip under it, and `touch-action` can't be changed once the
	// finger is down, so the strip refuses the scroll itself for as long as a drag is going on.
	$effect(() => {
		const element = list;
		if (!element) return;
		const hold = (event: TouchEvent) => {
			if (dragging) event.preventDefault();
		};
		element.addEventListener('touchmove', hold, { passive: false });
		return () => element.removeEventListener('touchmove', hold);
	});
</script>

<svelte:window
	onkeydown={(event) => {
		if (dragging && event.key === 'Escape') end(false);
	}}
/>

<ul
	bind:this={list}
	class="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 py-1"
	aria-label={t.photos}
>
	{#each photos as item, index (item.id)}
		{@const label = `${t.photo(index + 1, photos.length)} — ${status(item)}`}
		<li class="snap-start">
			<button
				type="button"
				class="relative block size-16 overflow-hidden rounded-2xl ring-1 ring-ink/10 transition select-none hover:ring-ink/25 aria-pressed:ring-3 aria-pressed:ring-accent motion-reduce:transition-none {dragging ===
				item.id
					? 'scale-110 shadow-lg ring-2 shadow-ink/20 ring-accent'
					: ''}"
				style="-webkit-touch-callout: none"
				aria-pressed={item.id === current}
				title={label}
				onpointerdown={(event) => down(event, item.id)}
				onpointermove={track}
				onpointerup={() => end(true)}
				onpointercancel={() => end(false)}
				oncontextmenu={(event) => event.preventDefault()}
				onclick={() => {
					if (!moved) onpick(item.id);
				}}
			>
				{#if item.url}
					<img src={item.url} alt="" draggable="false" class="size-full object-cover" />
				{:else}
					<span class="block size-full bg-ink/5"></span>
				{/if}
				<span class="sr-only">{label}</span>
				<span
					class="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-ink/70 px-1.5 py-0.5 text-xs font-bold text-white"
					aria-hidden="true"
				>
					<span>{index + 1}</span>
					{#if item.published}
						<Icon name="lock" class="size-3.5" />
					{:else if item.detection === 'pending'}
						<span class="size-2 rounded-full bg-white/70"></span>
					{:else if item.history.present.reviewed}
						<Icon name="check" class="size-3.5" />
					{:else if waiting(item)}
						<span class="text-apricot">{waiting(item)}</span>
					{:else}
						<span class="size-2 rounded-full bg-apricot"></span>
					{/if}
				</span>
			</button>
		</li>
	{/each}
</ul>
