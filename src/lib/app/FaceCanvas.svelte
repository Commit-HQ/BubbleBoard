<script lang="ts">
	import { untrack } from 'svelte';
	import stickerUrl from '$lib/assets/face-sticker.svg';
	import { boundedRect, type Rect, type Region } from '$lib/events/editor';
	let { url, width, height, regions, selected, original, zoom, label, regionLabel, onselect, onchange }: {
		url: string; width: number; height: number; regions: Region[]; selected: string | null;
		original: boolean; zoom: number; label: string; regionLabel: (n: number) => string;
		onselect: (id: string) => void; onchange: (id: string, rect: Rect) => void;
	} = $props();
	let svg: SVGSVGElement;
	let center = $state(untrack(() => ({ x: width / 2, y: height / 2 })));
	let drag = $state<{ pointer: number; start: DOMPoint; region?: Region; resize: boolean; center: { x: number; y: number }; moved: boolean }>();
	let draft = $state<Rect>();
	const view = $derived({ width: width / zoom, height: height / zoom });
	const origin = $derived({ x: Math.max(0, Math.min(width - view.width, center.x - view.width / 2)), y: Math.max(0, Math.min(height - view.height, center.y - view.height / 2)) });
	const handle = $derived(Math.max(width, height) / (24 * zoom));
	function point(event: PointerEvent) { return new DOMPoint(event.clientX, event.clientY).matrixTransform(svg.getScreenCTM()!.inverse()); }
	function down(event: PointerEvent) {
		if (event.button !== 0 || original) return;
		// A second finger cancels a region move; zoom has an explicit accessible control below the image.
		if (drag) { cancel(); return; }
		const target = (event.target as Element).closest('[data-region]');
		const region = regions.find(r => r.id === target?.getAttribute('data-region'));
		const already = region?.id === selected;
		if (region) onselect(region.id);
		if (region && !already) return;
		drag = { pointer: event.pointerId, start: point(event), region, resize: (event.target as Element).hasAttribute('data-resize'), center: { ...center }, moved: false };
		svg.setPointerCapture(event.pointerId);
	}
	function move(event: PointerEvent) {
		if (!drag || drag.pointer !== event.pointerId) return;
		const current = point(event), dx = current.x - drag.start.x, dy = current.y - drag.start.y;
		drag.moved ||= Math.abs(dx) + Math.abs(dy) > 1;
		if (drag.region) {
			const r = drag.region;
			draft = boundedRect(drag.resize ? { ...r, width: Math.max(r.minWidth, current.x - r.x), height: Math.max(r.minHeight, current.y - r.y) } : { ...r, x: r.x + dx, y: r.y + dy }, width, height);
		} else {
			center = { x: Math.max(view.width/2, Math.min(width-view.width/2, center.x-dx)), y: Math.max(view.height/2, Math.min(height-view.height/2, center.y-dy)) };
		}
	}
	function finish(event: PointerEvent) {
		if (!drag || drag.pointer !== event.pointerId) return;
		if (drag.region && draft && drag.moved) onchange(drag.region.id, draft);
		cancel();
	}
	function cancel() { if (drag && svg.hasPointerCapture(drag.pointer)) svg.releasePointerCapture(drag.pointer); drag = undefined; draft = undefined; }
	function key(event: KeyboardEvent, region: Region) {
		if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onselect(region.id); }
		const direction: Record<string, [number, number]> = { ArrowLeft: [-1,0], ArrowRight: [1,0], ArrowUp: [0,-1], ArrowDown: [0,1] };
		if (direction[event.key]) { event.preventDefault(); const [x,y] = direction[event.key]; onchange(region.id, boundedRect({ ...region, x: region.x+x*(event.shiftKey?10:1), y: region.y+y*(event.shiftKey?10:1) }, width, height)); }
	}
</script>

<svg bind:this={svg} viewBox={`${origin.x} ${origin.y} ${view.width} ${view.height}`} class="block max-h-[60dvh] w-full touch-none rounded-2xl bg-ink/5 select-none" role="group" aria-label={label} onpointerdown={down} onpointermove={move} onpointerup={finish} onpointercancel={cancel} onlostpointercapture={() => { drag = undefined; draft = undefined; }}>
	<image href={url} x="0" y="0" {width} {height} />
	{#if !original}
		{#each regions as region, index (region.id)}
			{@const rect = drag?.region?.id === region.id && draft ? draft : region}
			<g role="button" tabindex="0" aria-label={regionLabel(index + 1)} aria-pressed={selected === region.id} data-region={region.id} onkeydown={(event) => key(event, region)}>
				<rect x={rect.x} y={rect.y} width={rect.width} height={rect.height} fill="#f7d470" />
				<image href={stickerUrl} x={rect.x} y={rect.y} width={rect.width} height={rect.height} preserveAspectRatio="none" />
				<rect x={rect.x} y={rect.y} width={rect.width} height={rect.height} fill="none" stroke={selected === region.id ? '#29253d' : '#fff'} stroke-width={selected === region.id ? 4 : 1} vector-effect="non-scaling-stroke" />
				<text x={rect.x + rect.width/2} y={rect.y + rect.height/4} text-anchor="middle" font-size={Math.max(14, Math.min(rect.width,rect.height)*0.2)} fill="#29253d" font-weight="600">{index + 1}</text>
				{#if selected === region.id}
					<rect data-resize x={rect.x+rect.width-handle/2} y={rect.y+rect.height-handle/2} width={handle} height={handle} fill="#29253d" stroke="#fff" stroke-width="2" vector-effect="non-scaling-stroke" />
				{/if}
			</g>
		{/each}
	{/if}
</svg>
