<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import type { Snippet } from 'svelte';

	// The sticky header of every page: the logo leading home, then the page's links and controls.
	let {
		href,
		label,
		class: className = '',
		children
	}: {
		href: string;
		label?: string;
		class?: string;
		children?: Snippet;
	} = $props();
</script>

<header
	class="sticky top-3 z-10 my-3 flex min-h-14 items-center justify-between gap-4 rounded-full frosted py-1.5 pr-1.5 pl-3 {className}"
>
	<a
		class="inline-flex items-center gap-2.5 text-xl font-bold tracking-tight"
		{href}
		aria-label={label}
	>
		<img src={favicon} alt="" width="36" height="36" />
		<!-- Enlarged text on a phone narrows the page below 20rem; then only the logo shows. -->
		<span class="max-[20rem]:sr-only">BubbleBoard</span>
	</a>
	{@render children?.()}
</header>
