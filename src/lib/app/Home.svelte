<script lang="ts">
	import Bubble from '$lib/components/Bubble.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { messages, type Locale } from '$lib/i18n';
	import { appPath } from '$lib/paths';
	import Board from './Board.svelte';
	import NotificationCard from './NotificationCard.svelte';
	import PullToRefresh from './PullToRefresh.svelte';
	import { getApp } from './state.svelte';
	import { button } from './ui';

	// Everyone's home is the board of their classrooms, where staff also put up new notices and photos of the
	// corkboard, and pulling it down loads it again. It greets whoever opened it for the time of day, staff by
	// name; a family device can't read the name on its QR code, which is encrypted for staff. Managing the
	// kindergarten has its own page, opened from the header.
	let { locale }: { locale: Locale } = $props();
	const app = getApp();
	const t = $derived(messages[locale].app);
	const classrooms = $derived(app.myClassrooms);
	const staff = $derived(app.status === 'staff');
	/** The hour on the device's clock, read again when the app comes back into view. */
	let hour = $state(new Date().getHours());
	// The recovery card has no name.
	const greeting = $derived(t.home.greeting(hour, app.me?.recovery ? undefined : app.me?.name));
</script>

<svelte:document onvisibilitychange={() => (hour = new Date().getHours())} />

<PullToRefresh />

<section class="grid gap-8">
	<div class="relative isolate">
		<!-- The logo's big and small bubbles, drifting beside the greeting and heading. -->
		<Bubble class="-top-6 right-0 -z-10 size-20 sm:size-24" />
		<Bubble class="top-14 right-20 -z-10 size-9 sm:right-28" />
		<p class="pr-24 text-lg text-muted">{greeting}</p>
		<h1 class="pr-24 text-4xl sm:text-5xl">{t.notices.title}</h1>
		<!-- Several classrooms are named by the board's filter instead. -->
		{#if classrooms.length === 1}
			<p class="mt-2 text-lg text-muted">{classrooms[0].name}</p>
		{/if}
		{#if staff && classrooms.length}
			<div class="mt-6 flex flex-wrap gap-2">
				<a class={button.primary} href={appPath(locale, 'notice/new')}>
					<Icon name="stickyNote" class="size-4" />{t.notices.new}
				</a>
				<a class={button.secondary} href={appPath(locale, 'photo')}>
					<Icon name="presentation" class="size-4" />{t.photos.new}
				</a>
			</div>
		{/if}
	</div>

	<NotificationCard {locale} />

	{#if staff && !classrooms.length}
		<div class="grid justify-items-start gap-4">
			<p class="text-muted">{app.admin ? t.manage.emptyAdmin : t.notices.noClassrooms}</p>
			{#if app.admin}
				<a class={button.secondary} href={appPath(locale, 'manage')}>
					<Icon name="dashboard" class="size-4" />{t.manage.title}
				</a>
			{/if}
		</div>
	{:else}
		<Board {locale} />
	{/if}
</section>
