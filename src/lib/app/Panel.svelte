<script lang="ts">
	import bubble from '$lib/assets/bubble.svg';
	import Icon, { type IconName } from '$lib/components/Icon.svelte';
	import type { Snippet } from 'svelte';

	// A page-sized message: loading problems, empty states, and places to go next.
	let {
		icon,
		title,
		copy,
		alert = false,
		children
	}: {
		icon: IconName;
		title: string;
		copy?: string;
		alert?: boolean;
		children?: Snippet;
	} = $props();
</script>

<section
	class="relative isolate my-auto overflow-hidden rounded-4xl glass p-7 sm:p-10"
	role={alert ? 'alert' : undefined}
>
	<img src={bubble} alt="" class="pointer-events-none absolute -top-14 -right-14 -z-10 size-44" />
	<span class="grid size-11 place-items-center rounded-2xl bg-sunrise text-white">
		<Icon name={icon} />
	</span>
	<h1 class="mt-5 text-3xl sm:text-4xl">{title}</h1>
	{#if copy}<p class="mt-3 text-lg text-muted">{copy}</p>{/if}
	{#if children}<div class="mt-7 flex flex-wrap gap-3">{@render children()}</div>{/if}
</section>
