<script lang="ts">
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
		<h2 class="text-2xl">{mine ? t.mine : t.title}</h2>
		<p class="mt-2 text-muted">
			{#if mine}{meetingDay(locale, mine.start)} · {meetingTime(locale, mine.start)}–{meetingTime(
					locale,
					mine.end
				)}
			{:else if staff && app.meetingsLoaded}{upcoming.filter((s) => s.booked).length}
				{t.bookedCount} · {upcoming.filter((s) => !s.booked).length}
				{t.freeCount}
			{:else}{staff ? t.staffSummary : t.summary}{/if}
		</p>
		{#if mine}<p class="mt-1 text-muted">
				{app.myClassrooms.find((c) => c.id === mine.classroom)?.name}
			</p>{/if}
		<span class="mt-4 inline-block font-semibold">{staff || mine ? t.open : t.choose} →</span>
	</a>
{/if}
