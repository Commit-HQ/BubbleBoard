<script lang="ts">
	import { bubbleWidth, dotRadius, drawQr, type Square } from './qr';

	let {
		text,
		label,
		class: className = ''
	}: { text: string; label: string; class?: string } = $props();

	// Shapes with presentation attributes: sharp at any size and in print, with no generated markup and no
	// inline styles for the CSP. Gradient IDs are per code, because a sheet shows several.
	const id = $props.id();
	const qr = $derived(drawQr(text));
	const r = dotRadius;
	/** Every dot, finder ring, and eye in one path; nothing overlaps, so even-odd cuts the rings' holes. */
	const path = $derived(
		[
			...qr.dots.map(
				([x, y]) => `M${x - r} ${y}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`
			),
			...qr.finders.flatMap(({ outer, hole, eye }) => [outer, hole, eye].map(square))
		].join('')
	);

	function square({ x, y, size, radius: q }: Square) {
		const side = size - 2 * q;
		return `M${x + q} ${y}h${side}a${q} ${q} 0 0 1 ${q} ${q}v${side}a${q} ${q} 0 0 1 ${-q} ${q}h${-side}a${q} ${q} 0 0 1 ${-q} ${-q}v${-side}a${q} ${q} 0 0 1 ${q} ${-q}z`;
	}
</script>

<svg
	class={className}
	viewBox="{qr.view.x} {qr.view.y} {qr.view.size} {qr.view.size}"
	role="img"
	aria-label={label}
>
	<defs>
		<!-- The brand's colours, dark enough to read as black to scanners and black-and-white printers. -->
		<linearGradient
			id="{id}-ink"
			gradientUnits="userSpaceOnUse"
			x1="0"
			y1="0"
			x2={qr.size}
			y2={qr.size}
		>
			<stop offset="0" stop-color="#3f22c9" />
			<stop offset=".6" stop-color="#a3165f" />
			<stop offset="1" stop-color="#9a3412" />
		</linearGradient>
		<!-- The soap bubble's rainbow rim, as in src/lib/assets/bubble.svg. -->
		<linearGradient id="{id}-rim" x1="0" y1="0" x2="1" y2="1">
			<stop offset="0" stop-color="#7c5cff" />
			<stop offset=".3" stop-color="#4cc3ff" />
			<stop offset=".5" stop-color="#6fdcb4" />
			<stop offset=".72" stop-color="#ffc85a" />
			<stop offset="1" stop-color="#ff6fb1" />
		</linearGradient>
		<!-- The app icon's gradient, as in src/lib/assets/favicon.svg. -->
		<linearGradient id="{id}-icon" x1="0" y1="0" x2="1" y2="1">
			<stop offset="0" stop-color="#7c5cff" />
			<stop offset=".6" stop-color="#ff6fb1" />
			<stop offset="1" stop-color="#ffb36b" />
		</linearGradient>
	</defs>
	<circle
		cx={qr.size / 2}
		cy={qr.size / 2}
		r={qr.bubble}
		fill="none"
		stroke="url(#{id}-rim)"
		stroke-width={bubbleWidth}
	/>
	<path d={path} fill="url(#{id}-ink)" fill-rule="evenodd" />
	{#if qr.icon}
		<g transform="translate({qr.icon.x} {qr.icon.y}) scale({qr.icon.size / 64})">
			<rect width="64" height="64" rx="20" fill="url(#{id}-icon)" />
			<circle cx="27" cy="36" r="15" fill="#fff" />
			<circle cx="46" cy="19" r="7" fill="#fff" fill-opacity=".75" />
			<circle cx="47" cy="45" r="4.5" fill="#fff" fill-opacity=".55" />
		</g>
	{/if}
</svg>
