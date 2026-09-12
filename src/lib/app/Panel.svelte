<script lang="ts">
	import Bubble from '$lib/components/Bubble.svelte';
	import type { IconName } from '$lib/components/Icon.svelte';
	import IconTile from '$lib/components/IconTile.svelte';
	import type { Snippet } from 'svelte';

	// A page-sized panel: connecting, setup, loading problems, and places to go next.
	let {
		icon,
		title,
		copy,
		alert = false,
		children
	}: {
		icon: IconName;
		title: string;
		copy: string;
		alert?: boolean;
		children?: Snippet;
	} = $props();
</script>

<section
	class="relative isolate my-auto overflow-hidden rounded-4xl glass p-7 sm:p-10"
	role={alert ? 'alert' : undefined}
>
	<Bubble class="-top-14 -right-14 -z-10 size-44 sm:size-56" />
	<Bubble class="top-28 right-8 -z-10 size-10" />
	<IconTile {icon} />
	<h1 class="mt-5 max-w-sm text-4xl sm:text-5xl">{title}</h1>
	<p class="mt-3 max-w-md text-lg text-muted">{copy}</p>
	{@render children?.()}
</section>
