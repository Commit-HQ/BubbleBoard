<script lang="ts">
	import Icon, { type IconName } from '$lib/components/Icon.svelte';
	import { messages } from '$lib/i18n';
	import { onMount } from 'svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const t = $derived(messages[data.locale].app);

	// Prerendered while loading. Only the browser can tell, since it's where classroom keys live.
	let view: 'loading' | 'unsupported' | 'notConnected' = $state('loading');

	onMount(() => {
		// Keys are made with Web Crypto and kept in IndexedDB; browsers offer Web Crypto only on https
		// and localhost.
		view = isSecureContext && 'indexedDB' in window ? 'notConnected' : 'unsupported';
	});
</script>

<svelte:head>
	<title>BubbleBoard</title>
</svelte:head>

{#snippet panel(icon: IconName, title: string, copy: string)}
	<span class="grid size-11 place-items-center rounded-2xl bg-sunrise text-white">
		<Icon name={icon} />
	</span>
	<h1 class="mt-5 text-3xl sm:text-4xl">{title}</h1>
	<p class="mt-3 text-lg text-muted">{copy}</p>
{/snippet}

{#if view === 'loading'}
	<div class="grid justify-items-center gap-4 text-center">
		<p class="flex items-center gap-3 font-semibold text-muted" role="status">
			<span
				class="size-5 animate-spin rounded-full border-2 border-ink/15 border-t-accent motion-reduce:animate-none"
				aria-hidden="true"
			></span>
			{t.loading}
		</p>
		<noscript><p class="max-w-md text-muted">{t.noscript}</p></noscript>
	</div>
{:else if view === 'unsupported'}
	<section class="rounded-4xl glass p-7 sm:p-10" role="alert">
		{@render panel('alert', t.unsupported.title, t.unsupported.copy)}
	</section>
{:else}
	<section class="rounded-4xl glass p-7 sm:p-10">
		{@render panel('key', t.notConnected.title, t.notConnected.copy)}
	</section>
{/if}
