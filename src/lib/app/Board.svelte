<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { formatDay, messages, type Locale } from '$lib/i18n';
	import type { Notice } from '$lib/notices';
	import BoardPhoto from './BoardPhoto.svelte';
	import ConfirmDialog from './ConfirmDialog.svelte';
	import NoticeBody from './NoticeBody.svelte';
	import NoticeCard from './NoticeCard.svelte';
	import { getApp } from './state.svelte';
	import { choice, surface, button } from './ui';
	import { appPath } from '$lib/paths';

	// Home's board, as on the kindergarten's corkboard: the photos of its classrooms' boards, then the notices,
	// newest on top. With several classrooms, a filter shows one classroom's; it starts on all of them.
	let { locale }: { locale: Locale } = $props();
	const app = getApp();
	const t = $derived(messages[locale].app);
	const id = $props.id();
	const classrooms = $derived(app.myClassrooms);
	/** The classroom chosen in the filter, or '' for all of them. */
	let chosen = $state('');
	// A classroom the device no longer belongs to leaves the filter on all.
	const shown = $derived(classrooms.some((classroom) => classroom.id === chosen) ? chosen : '');
	const notices = $derived(
		shown ? app.board.filter((notice) => notice.classrooms.includes(shown)) : app.board
	);
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

	{#if app.eventsError}<p role="status" class="text-sm text-muted">{t.events.failed}</p>{/if}
	{#each app.events.filter((e) => !shown || e.classroom === shown) as event (event.id)}
		<article class="{surface} grid gap-3">
			<p class="text-sm text-muted">{t.events.title} · {formatDay(locale, event.value.date)}</p>
			<h2 class="text-3xl">{event.value.title}</h2>
			{#if event.value.description.content.length}
				<NoticeBody blocks={event.value.description.content} />
			{/if}
			<a
				class="{button.secondary} justify-self-start"
				href={`${appPath(locale, 'event')}?id=${event.id}`}
			>
				<Icon name="image" class="size-4" />{t.events.open} ({event.value.photos.length})
			</a>
		</article>
	{/each}
	{#if app.unreadableNotices}
		<p class="text-sm font-semibold text-muted">{t.notices.unreadable}</p>
	{/if}
	{#if notices.length}
		<ul class="grid gap-4">
			{#each notices as notice (notice.id)}
				<li><NoticeCard {locale} {notice} ondelete={() => (deleting = notice)} /></li>
			{/each}
		</ul>
	{:else}
		<p class="text-muted">
			{shown
				? t.notices.emptyClassroom
				: app.status === 'staff'
					? t.notices.emptyStaff
					: t.notices.empty}
		</p>
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
