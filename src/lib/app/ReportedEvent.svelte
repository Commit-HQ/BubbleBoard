<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { messages, type Locale } from '$lib/i18n';
	import { appPath } from '$lib/paths';
	import { namedPhotos } from './EventReports.svelte';
	import { getApp } from './state.svelte';
	import { button, surface } from './ui';

	// Atop a family's report of an event's photos: which event, which photos it named by their numbers in the
	// gallery, and whether they're still there. A photo a teacher covered again goes up under a new ID and one
	// taken down is gone, so a named photo the event no longer holds has been dealt with, and so has an event
	// no longer up. The gallery the link opens flags, for staff, the photos every open report names.
	let { locale, event, photos }: { locale: Locale; event: string; photos: string[] } = $props();
	const app = getApp();
	const r = $derived(messages[locale].app.reports);
	const up = $derived(app.events.find((item) => item.id === event && item.expiresAt > Date.now()));
</script>

<div class="{surface} mt-4 grid justify-items-start gap-2">
	<p class="flex items-center gap-2 text-sm font-semibold text-red-700">
		<Icon name="flag" class="size-4" />{r.label}
	</p>
	{#if up}
		<h2 class="text-2xl">{up.value.title}</h2>
		<p class="text-muted">
			{namedPhotos(
				locale,
				photos,
				up.value.photos.map(({ id }) => id)
			)}
		</p>
		<a class="{button.secondary} mt-1" href={appPath(locale, 'event', { id: event })}>
			{r.open}
		</a>
	{:else}
		<p class="text-muted">{r.eventGone}</p>
	{/if}
</div>
