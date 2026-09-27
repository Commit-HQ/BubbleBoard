<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { messages, type Locale } from '$lib/i18n';
	import type { Notice } from '$lib/notices';
	import BoardPhoto from './BoardPhoto.svelte';
	import ConfirmDialog from './ConfirmDialog.svelte';
	import EventCard from './EventCard.svelte';
	import NoticeCard from './NoticeCard.svelte';
	import { getApp } from './state.svelte';
	import { choice, disclosure } from './ui';

	// Home's board, as on the kindergarten's corkboard: the photos of its classrooms' boards, then the notices,
	// newest on top, then the events, newest on top. With several classrooms, a filter shows one classroom's;
	// it starts on all of them. What a family hid on this device waits folded away at the bottom.
	let { locale }: { locale: Locale } = $props();
	const app = getApp();
	const t = $derived(messages[locale].app);
	const id = $props.id();
	const classrooms = $derived(app.myClassrooms);
	/** The classroom chosen in the filter, or '' for all of them. */
	let chosen = $state('');
	// A classroom the device no longer belongs to leaves the filter on all.
	const shown = $derived(classrooms.some((classroom) => classroom.id === chosen) ? chosen : '');
	const allNotices = $derived(
		shown ? app.board.filter((notice) => notice.classrooms.includes(shown)) : app.board
	);
	/** Events by when they went up, newest first, as the notices are. */
	const allEvents = $derived(
		app.events
			.filter((event) => !shown || event.classroom === shown)
			.toSorted((a, b) => b.postedAt - a.postedAt)
	);
	const notices = $derived(allNotices.filter((notice) => !app.isHidden(notice)));
	const events = $derived(allEvents.filter((event) => !app.isHidden(event)));
	const hiddenNotices = $derived(allNotices.filter((notice) => app.isHidden(notice)));
	const hiddenEvents = $derived(allEvents.filter((event) => app.isHidden(event)));
	const hiddenCount = $derived(hiddenNotices.length + hiddenEvents.length);
	/** The board photos of the classrooms shown, in the classrooms' order. */
	const photos = $derived(
		classrooms
			.filter((classroom) => !shown || classroom.id === shown)
			.flatMap((classroom) => app.photos.filter((photo) => photo.classroom === classroom.id))
	);
	let deleting = $state.raw<Notice>();

	async function remove(notice: Notice) {
		await app.deleteNotice(notice);
		deleting = undefined;
	}
</script>

<div class="grid gap-4">
	{#if classrooms.length > 1}
		<fieldset>
			<legend class="sr-only">{t.notices.show}</legend>
			<div class="flex flex-wrap gap-2">
				{#each [{ id: '', name: t.notices.all }, ...classrooms] as option (option.id)}
					<!-- Forced colours drop the dark fill, so the chosen classroom is underlined there instead. -->
					<label
						class="{choice.option} inline-flex min-h-11 items-center rounded-full px-4 font-semibold forced-colors:has-checked:underline"
					>
						<input
							class="sr-only"
							type="radio"
							name="{id}-classroom"
							checked={option.id === shown}
							onchange={() => (chosen = option.id)}
						/>
						{option.name}
					</label>
				{/each}
			</div>
		</fieldset>
	{/if}

	{#if photos.length}
		<!-- Several photos scroll sideways, so the notices stay close. -->
		<ul class="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2" aria-label={t.photos.title}>
			{#each photos as photo (photo.id)}
				<li class="shrink-0 snap-start {photos.length > 1 ? 'w-5/6 sm:w-2/3' : 'w-full'}">
					<BoardPhoto {locale} {photo} />
				</li>
			{/each}
		</ul>
	{/if}

	{#if app.unreadableNotices}
		<p class="text-sm font-semibold text-muted">{t.notices.unreadable}</p>
	{/if}
	{#if notices.length}
		<ul class="grid gap-4">
			{#each notices as notice (notice.id)}
				<li><NoticeCard {locale} {notice} ondelete={() => (deleting = notice)} /></li>
			{/each}
		</ul>
	{:else if !hiddenNotices.length}
		<p class="text-muted">
			{shown
				? t.notices.emptyClassroom
				: app.status === 'staff'
					? t.notices.emptyStaff
					: t.notices.empty}
		</p>
	{/if}

	{#if app.eventsError}<p role="status" class="text-sm text-muted">{t.events.failed}</p>{/if}
	{#each events as event (event.id)}
		<EventCard {locale} {event} />
	{/each}

	{#if hiddenCount}
		<details class="group">
			<summary class={disclosure}>
				<Icon name="eyeOff" class="size-4" />{t.notices.hidden(hiddenCount)}
				<Icon
					name="chevronRight"
					class="size-4 transition-transform group-open:rotate-90 motion-reduce:transition-none"
				/>
			</summary>
			<div class="mt-2 grid gap-4">
				<p class="text-sm text-muted">{t.notices.hiddenHint}</p>
				{#each hiddenNotices as notice (notice.id)}
					<NoticeCard {locale} {notice} ondelete={() => (deleting = notice)} />
				{/each}
				{#each hiddenEvents as event (event.id)}
					<EventCard {locale} {event} />
				{/each}
			</div>
		</details>
	{/if}
</div>

{#if deleting}
	{@const notice = deleting}
	<ConfirmDialog
		{locale}
		title={t.notices.deleteTitle}
		copy={t.notices.deleteCopy}
		confirmLabel={t.notices.delete}
		danger
		onconfirm={() => remove(notice)}
		onclose={() => (deleting = undefined)}
	/>
{/if}
