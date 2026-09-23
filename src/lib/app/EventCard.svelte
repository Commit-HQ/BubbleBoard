<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import type { OpenEvent } from '$lib/events/types';
	import { messages, type Locale } from '$lib/i18n';
	import { appPath } from '$lib/paths';
	import EventActions from './EventActions.svelte';
	import EventHeading from './EventHeading.svelte';
	import { getApp, type Picture } from './state.svelte';
	import { button, surface } from './ui';

	// An event on the board: what it was, when, and the first of its photos as this card's own family sees it,
	// opening the gallery. That photo is put together on this device like every other one, so the card waits
	// until it is nearly on the screen before asking for it, and asks for one photo and no more. A device that
	// can't put photos together, or one the photo wouldn't reach, shows the card without it.
	let { locale, event }: { locale: Locale; event: OpenEvent } = $props();
	const app = getApp();
	const t = $derived(messages[locale].app.events);
	const tooOld = typeof OffscreenCanvas === 'undefined';
	const href = $derived(`${appPath(locale, 'event')}?id=${event.id}`);
	const until = $derived(
		new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long' }).format(event.expiresAt)
	);
	let card = $state<HTMLElement>();
	let cover = $state.raw<Picture>();
	let failed = $state(false);

	$effect(() => {
		const element = card;
		void event.id;
		if (!element || tooOld) return;
		let cancelled = false;
		const open = () =>
			app
				.eventCover(event)
				.then((picture) => {
					if (!cancelled) cover = picture;
				})
				.catch(() => {
					if (!cancelled) failed = true;
				});
		// Without an observer, such as on an older browser, the photo is simply opened with the board.
		if (typeof IntersectionObserver === 'undefined') {
			void open();
			return;
		}
		const observer = new IntersectionObserver(
			(entries) => {
				if (!entries.some((entry) => entry.isIntersecting)) return;
				observer.disconnect();
				void open();
			},
			{ rootMargin: '300px' }
		);
		observer.observe(element);
		return () => {
			cancelled = true;
			observer.disconnect();
		};
	});
</script>

<article class="{surface} grid gap-3" bind:this={card}>
	<EventHeading {locale} {event} />
	{#if !tooOld && !failed}
		<a
			class="block aspect-[4/3] overflow-hidden rounded-3xl bg-ink/5 sm:aspect-[16/9]"
			{href}
			aria-label={t.open}
		>
			{#if cover}<img src={cover.url} alt="" class="size-full object-cover" />{/if}
		</a>
	{/if}
	<a class="{button.secondary} justify-self-start" {href}>
		<Icon name="image" class="size-4" />{t.open} ({event.value.photos.length})
	</a>
	<p class="text-sm text-muted">{t.untilShort(until)}</p>
	{#if app.canChangeEvent(event)}
		<div class="-ml-3 flex flex-wrap gap-2">
			<EventActions {locale} {event} />
		</div>
	{/if}
</article>
