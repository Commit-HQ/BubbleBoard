<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import Screen from '$lib/app/Screen.svelte';
	import EventGallery from '$lib/app/EventGallery.svelte';
	import { getApp } from '$lib/app/state.svelte';
	import { queryParam } from '$lib/app/ui';
	import { messages } from '$lib/i18n';
	import { appPath } from '$lib/paths';
	import type { PageProps } from './$types';
	let { data }: PageProps = $props();
	const app = getApp();
	let now = $state(Date.now());
	onMount(() => {
		const timer = setInterval(() => (now = Date.now()), 1000);
		return () => clearInterval(timer);
	});
	const id = $derived(queryParam('id'));
	const event = $derived(app.events.find((e) => e.id === id && e.expiresAt > now));
</script>

<Screen locale={data.locale} title={messages[data.locale].app.events.title} need="connected">
	{#if event}<EventGallery
			locale={data.locale}
			{event}
			onremoved={() => goto(appPath(data.locale))}
		/>{:else}<p>{messages[data.locale].app.events.expired}</p>{/if}
</Screen>
