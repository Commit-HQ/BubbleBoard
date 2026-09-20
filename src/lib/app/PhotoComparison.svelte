<script lang="ts">
	let {
		original,
		covered,
		width,
		height,
		label
	}: { original: string; covered: string; width: number; height: number; label: string } = $props();
	let position = $state(50);
	const id = $props.id();
	let canvas: SVGSVGElement;
	function move(event: PointerEvent) {
		if (!canvas.hasPointerCapture(event.pointerId)) return;
		const box = canvas.getBoundingClientRect();
		position = Math.max(0, Math.min(100, ((event.clientX - box.left) / box.width) * 100));
	}
</script>

<svelte:window onblur={() => (position = 0)} />
<svelte:document
	onvisibilitychange={() => {
		if (document.hidden) position = 0;
	}}
/>
<div class="grid gap-2">
	<svg
		bind:this={canvas}
		viewBox={`0 0 ${width} ${height}`}
		class="w-full touch-none rounded-2xl"
		role="img"
		aria-label={label}
		onpointerdown={(event) => {
			canvas.setPointerCapture(event.pointerId);
			move(event);
		}}
		onpointermove={move}
		onpointerup={(event) => canvas.releasePointerCapture(event.pointerId)}
	>
		<defs
			><clipPath {id}><rect x="0" y="0" width={(width * position) / 100} {height} /></clipPath
			></defs
		>
		<image href={covered} {width} {height} />
		<image href={original} {width} {height} clip-path={`url(#${id})`} />
		<line
			x1={(width * position) / 100}
			x2={(width * position) / 100}
			y1="0"
			y2={height}
			stroke="white"
			stroke-width="3"
			vector-effect="non-scaling-stroke"
		/>
		<circle
			cx={(width * position) / 100}
			cy={height / 2}
			r={width / 35}
			fill="white"
			stroke="#29253d"
			stroke-width="2"
			vector-effect="non-scaling-stroke"
		/>
	</svg>
	<label class="flex items-center gap-3 text-sm"
		><span>{label}</span><input
			class="min-w-0 flex-1"
			type="range"
			min="0"
			max="100"
			bind:value={position}
		/></label
	>
</div>
