<script lang="ts">
	import EventPhotoEditor from '$lib/app/EventPhotoEditor.svelte';
	import Screen from '$lib/app/Screen.svelte';
	import { getApp } from '$lib/app/state.svelte';
	import { queryParam } from '$lib/app/ui';
	import { messages } from '$lib/i18n';
	import type { PageProps } from './$types';
	let { data }: PageProps = $props();
	const app = getApp();
	const t = $derived(messages[data.locale].app);
	const id = $derived(queryParam('id'));
	const event = $derived(app.events.find((candidate) => candidate.id === id));
</script>

<Screen locale={data.locale} title={event ? t.events.editTitle : t.notFound.title} need="connected">
	{#if event && app.canChangeEvent(event)}
		{#key event.id}
			<EventPhotoEditor locale={data.locale} {event} />
		{/key}
	{:else}
		<p class="text-muted">{t.notFound.copy}</p>
	{/if}
</Screen>
