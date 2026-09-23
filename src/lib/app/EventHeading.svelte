<script lang="ts">
	import type { OpenEvent } from '$lib/events/types';
	import { byline, formatDay, messages, type Locale } from '$lib/i18n';
	import NoticeBody from './NoticeBody.svelte';

	// An event's heading, on its board card and atop its gallery: its day, who put it up and when, and whether
	// it was changed since, as a notice's card says it, then its title and words.
	let { locale, event }: { locale: Locale; event: OpenEvent } = $props();
	const t = $derived(messages[locale].app.events);
</script>

<header class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm text-muted">
	<p>{t.title} · {formatDay(locale, event.value.date)}</p>
	<p>{byline(locale, event.value.author, event.postedAt, event.editedAt ? t.edited : undefined)}</p>
</header>
<h2 class="text-3xl">{event.value.title}</h2>
{#if event.value.description.content.length}
	<NoticeBody blocks={event.value.description.content} />
{/if}
