<script module lang="ts">
	import { messages as dictionaries, type Locale as Language } from '$lib/i18n';
	/**
	 * Which photos a report names, by the numbers on the gallery's squares (`order` is the gallery's photo IDs
	 * in order), or the whole event, and how many of them have been changed or taken down since.
	 */
	export function namedPhotos(locale: Language, photos: string[], order: string[]) {
		const r = dictionaries[locale].app.reports;
		if (!photos.length) return r.wholeEvent;
		const numbers = photos.map((photo) => order.indexOf(photo) + 1).filter((at) => at > 0);
		const gone = photos.length - numbers.length;
		const left = numbers.length ? r.numbers(numbers.sort((a, b) => a - b)) : '';
		return [left, gone ? r.gone(gone, photos.length) : ''].filter(Boolean).join('. ');
	}
</script>

<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { messages, type Locale } from '$lib/i18n';
	import { appPath } from '$lib/paths';
	import { getApp } from './state.svelte';
	import { button, surface } from './ui';

	// For staff, above an event's gallery and its editor's photos: every family's open report of the event,
	// who sent it, and which photos it names by the numbers on their squares, each with its conversation. A
	// photo covered again goes up under a new ID and one taken down is gone, so a named photo the event no
	// longer holds has been dealt with; a report the teachers closed is dealt with, and isn't listed.
	let { locale, event, order }: { locale: Locale; event: string; order: string[] } = $props();
	const app = getApp();
	const r = $derived(messages[locale].app.reports);
	const m = $derived(messages[locale].app.messaging);
	const reports = $derived(app.openReportsOf(event));

	function sender(family: string, classroom: string) {
		const name = app.catalog.families.find((item) => item.id === family)?.name ?? m.parent;
		const children = app.catalog.children
			.filter((child) => child.classroom === classroom && child.families.includes(family))
			.map((child) => child.name);
		return children.length ? `${name} · ${m.children(children)}` : name;
	}
</script>

{#if reports.length}
	<section class="{surface} grid gap-3" aria-labelledby="reports-{event}">
		<h2 id="reports-{event}" class="flex items-center gap-2 text-xl">
			<Icon name="flag" class="size-5 text-red-700" />{r.title}
		</h2>
		<ul class="grid gap-3">
			{#each reports as report (report.id)}
				<li class="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
					<span class="min-w-0">
						<span class="block font-semibold">{sender(report.family, report.classroom)}</span>
						<span class="block text-sm text-muted">{namedPhotos(locale, report.photos, order)}</span
						>
					</span>
					<a class={button.quiet} href={appPath(locale, 'messages', { id: report.id })}>
						{r.openReport}
					</a>
				</li>
			{/each}
		</ul>
	</section>
{/if}
