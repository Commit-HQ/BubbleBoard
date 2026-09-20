<script lang="ts">
	import { untrack } from 'svelte';
	import { stickerUrl } from '$lib/events/stickers';
	import { boundedRect, type Rect, type Region } from '$lib/events/editor';
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
		onselect: (id: string) => void;
		onchange: (id: string, rect: Rect) => void;
		onviewchange: (center: { x: number; y: number }) => void;
	} = $props();
	let svg: SVGSVGElement;
	let center = $state(untrack(() => ({ x: width / 2, y: height / 2 })));
	let drag = $state<{
		pointer: number;
		start: DOMPoint;
		client: { x: number; y: number };
		region?: Region;
		resize: boolean;
		center: { x: number; y: number };
		moved: boolean;
	}>();
	let draft = $state<Rect>();
	const pointers = new Map<number, { x: number; y: number }>();
	let pinch: { distance: number; zoom: number } | undefined;
	const view = $derived({ width: width / zoom, height: height / zoom });
	const origin = $derived({
		x: Math.max(0, Math.min(width - view.width, center.x - view.width / 2)),
		y: Math.max(0, Math.min(height - view.height, center.y - view.height / 2))
	});
	const handle = $derived(Math.max(width, height) / (24 * zoom));
	$effect(() => onviewchange({ x: origin.x + view.width / 2, y: origin.y + view.height / 2 }));
	$effect(() => {
		if (original) cancel();
	});
	function distance() {
		const [a, b] = [...pointers.values()];
		return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
	}
	function point(event: PointerEvent) {
		return new DOMPoint(event.clientX, event.clientY).matrixTransform(
			svg.getScreenCTM()!.inverse()
		);
	}
	function down(event: PointerEvent) {
		if (event.button !== 0) return;
		pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
		svg.setPointerCapture(event.pointerId);
		if (pointers.size >= 2) {
			// Discard the uncommitted one-finger move before zooming with two fingers.
			drag = undefined;
			draft = undefined;
			pinch = { distance: Math.max(1, distance()), zoom };
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
			resize: (event.target as Element).hasAttribute('data-resize'),
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
			return;
		}
		if (!drag || drag.pointer !== event.pointerId) return;
		const current = point(event),
			dx = current.x - drag.start.x,
			dy = current.y - drag.start.y;
		drag.moved ||= Math.abs(dx) + Math.abs(dy) > 1;
		if (drag.region) {
			const r = drag.region;
			draft = boundedRect(
				drag.resize
					? {
							...r,
							width: Math.max(r.minWidth, current.x - r.x),
							height: Math.max(r.minHeight, current.y - r.y)
						}
					: { ...r, x: r.x + dx, y: r.y + dy },
				width,
				height
			);
		} else {
			const scale = svg.getScreenCTM()!;
			center = {
				x: Math.max(
					view.width / 2,
					Math.min(
						width - view.width / 2,
						drag.center.x - (event.clientX - drag.client.x) / scale.a
					)
				),
				y: Math.max(
					view.height / 2,
					Math.min(
						height - view.height / 2,
						drag.center.y - (event.clientY - drag.client.y) / scale.d
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
	viewBox={`${origin.x} ${origin.y} ${view.width} ${view.height}`}
	class="block w-full touch-none rounded-2xl bg-ink/5 select-none"
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
		{#each regions as region, index (region.id)}
			{@const rect = drag?.region?.id === region.id && draft ? draft : region}
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
				<rect x={rect.x} y={rect.y} width={rect.width} height={rect.height} fill="#f7d470" />
				<image
					href={stickerUrl(region.sticker)}
					x={rect.x}
					y={rect.y}
					width={rect.width}
					height={rect.height}
					preserveAspectRatio="none"
				/>
				<rect
					x={rect.x}
					y={rect.y}
					width={rect.width}
					height={rect.height}
					fill="none"
					stroke="#29253d"
					stroke-opacity="0.35"
					stroke-width={selected === region.id ? 8 : 6}
					vector-effect="non-scaling-stroke"
				/>
				<rect
					x={rect.x}
					y={rect.y}
					width={rect.width}
					height={rect.height}
					fill="none"
					stroke={region.child ? '#15803d' : region.covered ? '#dc2626' : '#fff'}
					stroke-width={selected === region.id ? 5 : 3}
					vector-effect="non-scaling-stroke"
				/>
				<text
					x={rect.x + rect.width / 2}
					y={rect.y + rect.height / 4}
					text-anchor="middle"
					font-size={Math.max(14, Math.min(rect.width, rect.height) * 0.2)}
					fill="#29253d"
					font-weight="600">{index + 1}</text
				>
				{#if selected === region.id}
					{@const grip = Math.min(handle, rect.width / 2, rect.height / 2)}
					<circle
						data-resize
						class="cursor-nwse-resize"
						cx={rect.x + rect.width}
						cy={rect.y + rect.height}
						r={grip / 2}
						fill="#29253d"
						stroke="#fff"
						stroke-width="2"
						vector-effect="non-scaling-stroke"
					/>
				{/if}
			</g>
		{/each}
	{/if}
</svg>
