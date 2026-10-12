<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { messages, type Locale } from '$lib/i18n';
	import { appPath } from '$lib/paths';
	import { meetingDay, meetingTime } from '$lib/meetings';
	import { getApp } from './state.svelte';
	import { everyHalfMinute, surface } from './ui';
	let { locale }: { locale: Locale } = $props();
	const app = getApp();
	const t = $derived(messages[locale].app.meetings);
	let now = $state(Date.now());
	everyHalfMinute(() => (now = Date.now()));
	// The server sends only the classrooms this card may see, so what's left to pick out is what's ahead.
	const upcoming = $derived(app.meetings.filter((s) => s.start > now));
	const mine = $derived(upcoming.find((s) => s.mine));
	const staff = $derived(app.status === 'staff');
</script>

<svelte:document onvisibilitychange={() => (now = Date.now())} />

{#if staff || (app.meetingsLoaded && upcoming.length)}
	<a href={appPath(locale, 'meetings')} class="{surface} block transition hover:bg-white/80">
		{#if mine}
			<h2 class="text-2xl">{t.myMeeting}</h2>
			<div class="mt-4 rounded-3xl bg-white p-4 ring-2 ring-accent/40">
				<p class="flex items-center gap-2 text-sm font-semibold text-accent">
					<span class="grid size-5 place-items-center rounded-full bg-accent text-white"
						><Icon name="check" class="size-3.5" /></span
					>{t.bookedBadge}
				</p>
				<p class="mt-3 font-semibold first-letter:uppercase">{meetingDay(locale, mine.start)}</p>
				<p class="mt-1 flex items-center gap-2 text-2xl font-bold">
					<Icon name="clock" class="size-5 text-muted" />{meetingTime(
						locale,
						mine.start
					)}–{meetingTime(locale, mine.end)}
				</p>
				<p class="mt-1 text-sm text-muted">
					{app.myClassrooms.find((c) => c.id === mine.classroom)?.name}
				</p>
			</div>
			<span class="mt-4 inline-block font-semibold">{t.change} →</span>
		{:else}
			<h2 class="text-2xl">{t.title}</h2>
			<p class="mt-2 text-muted">
				{#if staff && app.meetingsLoaded}{t.bookedCount(upcoming.filter((s) => s.booked).length)}
					· {t.freeCount(upcoming.filter((s) => !s.booked).length)}
				{:else}{staff ? t.staffSummary : t.summary}{/if}
			</p>
			<span class="mt-4 inline-block font-semibold">{staff ? t.open : t.choose} →</span>
		{/if}
	</a>
{/if}
