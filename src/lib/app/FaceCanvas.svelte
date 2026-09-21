<script lang="ts">
	import { untrack } from 'svelte';
	import { stickerUrl } from '$lib/events/stickers';
	import { boundedRect, type Rect, type Region } from '$lib/events/editor';
	import FaceNames from './FaceNames.svelte';

	/** A corner of the selected cover, named by the two edges that meet there. */
	type Corner = 'nw' | 'ne' | 'sw' | 'se';
	const corners: Corner[] = ['nw', 'ne', 'sw', 'se'];
	let {
		url,
		width,
		height,
		regions,
		selected,
		original,
		zoom = $bindable(1),
		label,
		regionLabel,
		name,
		onselect,
		onchange,
		onviewchange
	}: {
		url: string;
		width: number;
		height: number;
		regions: Region[];
		selected: string | null;
		original: boolean;
		zoom: number;
		label: string;
		regionLabel: (n: number) => string;
		/** What the classroom calls a child, by its ID, written under the cover it belongs to. */
		name: (child: string) => string;
		onselect: (id: string) => void;
		onchange: (id: string, rect: Rect) => void;
		onviewchange: (center: { x: number; y: number }) => void;
	} = $props();
	let svg: SVGSVGElement;
	/** How wide the photo is drawn, watched as the window changes, so a handle can be sized in real pixels. */
	let rendered = $state(0);
	let center = $state(untrack(() => ({ x: width / 2, y: height / 2 })));
	let drag = $state<{
		pointer: number;
		start: DOMPoint;
		client: { x: number; y: number };
		region?: Region;
		/** Which corner is being pulled, if any; the corner opposite it stays where it is. */
		corner?: Corner;
		center: { x: number; y: number };
		moved: boolean;
	}>();
	let draft = $state<Rect>();
	const pointers = new Map<number, { x: number; y: number }>();
	let pinch: { distance: number; zoom: number; anchor: DOMPoint } | undefined;
	const view = $derived({ width: width / zoom, height: height / zoom });
	const origin = $derived({
		x: Math.max(0, Math.min(width - view.width, center.x - view.width / 2)),
		y: Math.max(0, Math.min(height - view.height, center.y - view.height / 2))
	});
	/** How much of the image one screen pixel covers, so handles stay thumb-sized at any zoom and photo size. */
	const unit = $derived(rendered ? view.width / rendered : Math.max(width, height) / 360);
	/** The covers where they are drawn, so a name follows the one being moved or resized. */
	const drawn = $derived(
		regions.map((region) =>
			drag?.region?.id === region.id && draft ? { ...region, ...draft } : region
		)
	);
	$effect(() => onviewchange({ x: origin.x + view.width / 2, y: origin.y + view.height / 2 }));
	$effect(() => {
		if (original) cancel();
	});
	// Naming a face moves on to the next one, which while zoomed in may be off the screen: the view goes to it.
	// Only a new selection does this, so panning the photo by hand is never overruled a moment later.
	let followed = untrack(() => selected);
	$effect(() => {
		const id = selected;
		if (id === followed) return;
		followed = id;
		untrack(() => {
			const region = regions.find((r) => r.id === id);
			if (
				!region ||
				(region.x >= origin.x &&
					region.y >= origin.y &&
					region.x + region.width <= origin.x + view.width &&
					region.y + region.height <= origin.y + view.height)
			)
				return;
			center = look(region.x + region.width / 2, region.y + region.height / 2);
		});
	});
	/** The nearest view centre that keeps the photo filling the frame. */
	function look(x: number, y: number) {
		return {
			x: Math.max(view.width / 2, Math.min(width - view.width / 2, x)),
			y: Math.max(view.height / 2, Math.min(height - view.height / 2, y))
		};
	}
	function distance() {
		const [a, b] = [...pointers.values()];
		return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
	}
	/** Halfway between two fingers, in screen coordinates. */
	function between() {
		const [a, b] = [...pointers.values()];
		return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
	}
	/** Where a pointer is in image coordinates. The caller passes the matrix so a move only asks for it once. */
	function point(event: PointerEvent, screen = svg.getScreenCTM()!) {
		return new DOMPoint(event.clientX, event.clientY).matrixTransform(screen.inverse());
	}
	function down(event: PointerEvent) {
		if (event.button !== 0) return;
		pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
		svg.setPointerCapture(event.pointerId);
		if (pointers.size >= 2) {
			// Discard the uncommitted one-finger move before zooming with two fingers.
			drag = undefined;
			draft = undefined;
			const mid = between();
			pinch = {
				distance: Math.max(1, distance()),
				zoom,
				anchor: new DOMPoint(mid.x, mid.y).matrixTransform(svg.getScreenCTM()!.inverse())
			};
			return;
		}
		const target = (event.target as Element).closest('[data-region]');
		const region = regions.find((r) => r.id === target?.getAttribute('data-region'));
		const already = region?.id === selected;
		if (region) onselect(region.id);
		if (region && !already) return;
		drag = {
			pointer: event.pointerId,
			start: point(event),
			client: { x: event.clientX, y: event.clientY },
			region,
			corner: ((event.target as Element).getAttribute('data-resize') as Corner) ?? undefined,
			center: { ...center },
			moved: false
		};
	}
	function move(event: PointerEvent) {
		if (pointers.has(event.pointerId))
			pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
		if (pinch && pointers.size >= 2) {
			zoom =
				Math.round(Math.max(1, Math.min(4, (pinch.zoom * distance()) / pinch.distance)) * 100) /
				100;
			// The bit of photo the fingers started on stays under them, so a pinch zooms where the teacher looks
			// and moving both fingers together slides the photo along with them.
			const box = svg.getBoundingClientRect();
			const mid = between();
			const seen = { width: width / zoom, height: height / zoom };
			center = look(
				pinch.anchor.x - ((mid.x - box.left) / box.width) * seen.width + seen.width / 2,
				pinch.anchor.y - ((mid.y - box.top) / box.height) * seen.height + seen.height / 2
			);
			return;
		}
		if (!drag || drag.pointer !== event.pointerId) return;
		// Reading the matrix forces a layout flush, so this move takes one and both branches share it.
		const screen = svg.getScreenCTM()!;
		const current = point(event, screen),
			dx = current.x - drag.start.x,
			dy = current.y - drag.start.y;
		drag.moved ||= Math.abs(dx) + Math.abs(dy) > 1;
		if (drag.region) {
			const r = drag.region;
			draft = boundedRect(
				drag.corner ? pulled(r, drag.corner, current) : { ...r, x: r.x + dx, y: r.y + dy },
				width,
				height
			);
		} else {
			center = {
				x: Math.max(
					view.width / 2,
					Math.min(
						width - view.width / 2,
						drag.center.x - (event.clientX - drag.client.x) / screen.a
					)
				),
				y: Math.max(
					view.height / 2,
					Math.min(
						height - view.height / 2,
						drag.center.y - (event.clientY - drag.client.y) / screen.d
					)
				)
			};
		}
	}
	function finish(event: PointerEvent) {
		if (pinch) {
			cancel();
			return;
		}
		pointers.delete(event.pointerId);
		if (!drag || drag.pointer !== event.pointerId) return;
		if (drag.region && draft && drag.moved) onchange(drag.region.id, draft);
		cancel();
	}
	function cancel() {
		const captured = [...pointers.keys()];
		pointers.clear();
		pinch = undefined;
		drag = undefined;
		draft = undefined;
		for (const id of captured) if (svg?.hasPointerCapture(id)) svg.releasePointerCapture(id);
	}
	/** The cover as a corner pulled to this point leaves it: the corner opposite stays exactly where it was. */
	function pulled(region: Region, corner: Corner, to: DOMPoint): Rect {
		const [west, north] = [corner.includes('w'), corner.includes('n')];
		const fixed = {
			x: west ? region.x + region.width : region.x,
			y: north ? region.y + region.height : region.y
		};
		// A finger may run off the photo; the corner stops at its edge, or fitting the cover back inside would
		// push the fixed corner along.
		const at = { x: Math.max(0, Math.min(width, to.x)), y: Math.max(0, Math.min(height, to.y)) };
		const x = west ? Math.min(at.x, fixed.x - region.minWidth) : fixed.x;
		const y = north ? Math.min(at.y, fixed.y - region.minHeight) : fixed.y;
		return {
			x,
			y,
			width: west ? fixed.x - x : Math.max(region.minWidth, at.x - x),
			height: north ? fixed.y - y : Math.max(region.minHeight, at.y - y)
		};
	}
	function key(event: KeyboardEvent, region: Region) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			onselect(region.id);
		}
		const direction: Record<string, [number, number]> = {
			ArrowLeft: [-1, 0],
			ArrowRight: [1, 0],
			ArrowUp: [0, -1],
			ArrowDown: [0, 1]
		};
		if (direction[event.key]) {
			event.preventDefault();
			const [x, y] = direction[event.key];
			onchange(
				region.id,
				boundedRect(
					{
						...region,
						...(event.altKey
							? {
									width: Math.max(region.minWidth, region.width + x * (event.shiftKey ? 10 : 1)),
									height: Math.max(region.minHeight, region.height + y * (event.shiftKey ? 10 : 1))
								}
							: {
									x: region.x + x * (event.shiftKey ? 10 : 1),
									y: region.y + y * (event.shiftKey ? 10 : 1)
								})
					},
					width,
					height
				)
			);
		}
	}
</script>

<svg
	bind:this={svg}
	bind:clientWidth={rendered}
	viewBox={`${origin.x} ${origin.y} ${view.width} ${view.height}`}
	class="block w-full touch-none bg-ink/5 select-none"
	role="group"
	aria-label={label}
	onpointerdown={down}
	onpointermove={move}
	onpointerup={finish}
	onpointercancel={cancel}
	onlostpointercapture={(event) => {
		if (pointers.has(event.pointerId)) cancel();
	}}
>
	<image href={url} x="0" y="0" {width} {height} />
	{#if !original}
		{#each drawn as region, index (region.id)}
			<g
				role="button"
				tabindex="0"
				class="cursor-grab"
				aria-label={regionLabel(index + 1)}
				aria-pressed={selected === region.id}
				data-region={region.id}
				onclick={() => onselect(region.id)}
				onkeydown={(event) => key(event, region)}
			>
				<rect
					x={region.x}
					y={region.y}
					width={region.width}
					height={region.height}
					fill="#f7d470"
				/>
				<image
					href={stickerUrl(region.sticker)}
					x={region.x}
					y={region.y}
					width={region.width}
					height={region.height}
					preserveAspectRatio="none"
				/>
				<rect
					x={region.x}
					y={region.y}
					width={region.width}
					height={region.height}
					fill="none"
					stroke="#29253d"
					stroke-opacity="0.35"
					stroke-width={selected === region.id ? 8 : 6}
					vector-effect="non-scaling-stroke"
				/>
				<rect
					x={region.x}
					y={region.y}
					width={region.width}
					height={region.height}
					fill="none"
					stroke={region.child ? '#15803d' : region.covered ? '#29253d' : '#ffb36b'}
					stroke-width={selected === region.id ? 5 : 3}
					vector-effect="non-scaling-stroke"
				/>
				<text
					x={region.x + region.width / 2}
					y={region.y + region.height / 4}
					text-anchor="middle"
					font-size={Math.max(14, Math.min(region.width, region.height) * 0.2)}
					fill="#29253d"
					font-weight="600">{index + 1}</text
				>
				{#if selected === region.id}
					<!-- A thumb needs about 44 pixels of it, however small the cover is drawn, so each corner carries an
					     invisible circle that size around its small dot. On a small cover the circles shrink to a third
					     of it instead of swallowing it, leaving the middle free to drag. -->
					{@const grip = Math.min(22 * unit, region.width / 3, region.height / 3)}
					{#each corners as corner (corner)}
						{@const cx = region.x + (corner.includes('w') ? 0 : region.width)}
						{@const cy = region.y + (corner.includes('n') ? 0 : region.height)}
						<circle
							data-resize={corner}
							class={corner === 'nw' || corner === 'se'
								? 'cursor-nwse-resize'
								: 'cursor-nesw-resize'}
							{cx}
							{cy}
							r={grip}
							fill="#29253d"
							fill-opacity="0"
							pointer-events="all"
						/>
						<circle
							class="pointer-events-none"
							{cx}
							{cy}
							r={Math.min(6 * unit, grip)}
							fill="#29253d"
							stroke="#fff"
							stroke-width="2"
							vector-effect="non-scaling-stroke"
						/>
					{/each}
				{/if}
			</g>
		{/each}
		<FaceNames regions={drawn} {name} />
	{/if}
</svg>
