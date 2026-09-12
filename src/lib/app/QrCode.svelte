<script lang="ts">
	import encodeQR from 'qr';

	let {
		text,
		label,
		class: className = ''
	}: { text: string; label: string; class?: string } = $props();

	const modules = $derived(encodeQR(text, 'raw'));
	// The dark modules as one path of unit squares: sharp at any size and in print, with no generated
	// markup and no inline styles for the CSP.
	const path = $derived(
		modules.flatMap((row, y) => row.map((dark, x) => (dark ? `M${x} ${y}h1v1h-1z` : ''))).join('')
	);
</script>

<svg
	class={className}
	viewBox="0 0 {modules.length} {modules.length}"
	role="img"
	aria-label={label}
	shape-rendering="crispEdges"><path d={path} fill="currentColor" /></svg
>
