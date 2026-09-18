<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import type { Snippet } from 'svelte';

	// The sticky header of every page: the logo leading home, then the page's links and controls. `links` is
	// how many icon links sit beside the name, which is what decides whether the name still fits.
	let {
		href,
		label,
		links = 0,
		class: className = '',
		children
	}: {
		href: string;
		label?: string;
		links?: number;
		class?: string;
		children?: Snippet;
	} = $props();

	// Enlarged text on a phone narrows the page below 20rem. Beside the name, each icon link takes 44px of its
	// own, so three of them leave the name no room below 24rem and four none below 26rem; under that the logo
	// stands for the name on its own.
	const nameHidden = $derived(
		links > 3 ? 'max-[26rem]:sr-only' : links > 0 ? 'max-[24rem]:sr-only' : 'max-[20rem]:sr-only'
	);
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
		<span class={nameHidden}>BubbleBoard</span>
	</a>
	{@render children?.()}
</header>
