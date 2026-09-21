<script lang="ts">
	import Bubble from '$lib/components/Bubble.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { messages, type Locale } from '$lib/i18n';
	import { appPath } from '$lib/paths';
	import Board from './Board.svelte';
	import DeviceNameCard from './DeviceNameCard.svelte';
	import MeetingsCard from './MeetingsCard.svelte';
	import NotificationCard from './NotificationCard.svelte';
	import PullToRefresh from './PullToRefresh.svelte';
	import { getApp } from './state.svelte';
	import { button } from './ui';

	// Everyone's home is the board of their classrooms, where staff also put up new notices and photos of the
	// corkboard, and pulling it down loads it again. Staff are greeted by name for the time of day; a family
	// device can't read the name on its QR code, which is encrypted for staff, and the recovery card has none,
	// so they aren't greeted. Managing the kindergarten has its own page, opened from the header.
	let { locale }: { locale: Locale } = $props();
	const app = getApp();
	const t = $derived(messages[locale].app);
	const classrooms = $derived(app.myClassrooms);
	const staff = $derived(app.status === 'staff');
	const name = $derived(app.myName);
	/** The hour on the device's clock, read again when the app comes back into view. */
	let hour = $state(new Date().getHours());
</script>

<svelte:document onvisibilitychange={() => (hour = new Date().getHours())} />

<PullToRefresh />

<section class="grid gap-8">
	<div class="relative isolate">
		<!-- The logo's big and small bubbles, drifting beside the heading. -->
		<Bubble class="-top-6 right-0 -z-10 size-20 sm:size-24" />
		<Bubble class="top-8 right-20 -z-10 size-9 sm:right-28" />
		{#if name}<p class="pr-24 text-lg text-muted">{t.home.greeting(hour, name)}</p>{/if}
		<h1 class="pr-24 text-4xl sm:text-5xl">{t.notices.title}</h1>
		{#if staff && classrooms.length}
			<div class="mt-6 flex flex-wrap gap-2">
				<a class={button.primary} href={appPath(locale, 'notice/new')}>
					<Icon name="stickyNote" class="size-4" />{t.notices.new}
				</a>
				<a class={button.secondary} href={appPath(locale, 'photo')}>
					<Icon name="presentation" class="size-4" />{t.photos.new}
				</a>
				<a class={button.secondary} href={appPath(locale, 'event/new')}>
					<Icon name="smile" class="size-4" />{t.events.new}
				</a>
			</div>
		{/if}
	</div>

	<NotificationCard {locale} />

	{#if !staff}<DeviceNameCard {locale} />{/if}

	{#if classrooms.length}<MeetingsCard {locale} />{/if}

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
