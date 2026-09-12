<script lang="ts">
	import { bubbleWidth, dotRadius, drawQr } from './qr';

	let {
		text,
		label,
		class: className = ''
	}: { text: string; label: string; class?: string } = $props();

	// Shapes with presentation attributes: sharp at any size and in print, with no generated markup and no
	// inline styles for the CSP. Gradient IDs are per code, because a sheet shows several.
	const id = $props.id();
	const qr = $derived(drawQr(text));
	const middle = $derived(qr.size / 2);
	/** Every dot, finder ring, and eye in one path; nothing overlaps, so even-odd cuts the rings' holes. */
	const path = $derived(
		[
			...qr.dots.map(([x, y]) => circle(x, y, dotRadius)),
			...qr.finders.flatMap(([x, y]) => [circle(x, y, 3.5), circle(x, y, 2.5), circle(x, y, 1.5)])
		].join('')
	);

	function circle(x: number, y: number, r: number) {
		return `M${x - r} ${y}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;
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
			x1={qr.view.x}
			y1={qr.view.y}
			x2={qr.view.x + qr.view.size}
			y2={qr.view.y + qr.view.size}
		>
			<stop offset=".15" stop-color="#3f22c9" />
			<stop offset=".6" stop-color="#a3165f" />
			<stop offset=".85" stop-color="#9a3412" />
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
		cx={middle}
		cy={middle}
		r={qr.bubble}
		fill="none"
		stroke="url(#{id}-rim)"
		stroke-width={bubbleWidth}
	/>
	<path d={path} fill="url(#{id}-ink)" fill-rule="evenodd" />
	{#if qr.icon}
		<!-- The app icon, round like a bubble, from its 64-unit design. -->
		<g transform="translate({middle - qr.icon} {middle - qr.icon}) scale({qr.icon / 32})">
			<circle cx="32" cy="32" r="32" fill="url(#{id}-icon)" />
			<circle cx="27" cy="36" r="15" fill="#fff" />
			<circle cx="46" cy="19" r="7" fill="#fff" fill-opacity=".75" />
			<circle cx="47" cy="45" r="4.5" fill="#fff" fill-opacity=".55" />
		</g>
	{/if}
</svg>
