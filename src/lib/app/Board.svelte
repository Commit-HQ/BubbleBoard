<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { messages, type Locale } from '$lib/i18n';
	import type { Notice } from '$lib/notices';
	import BoardPhoto from './BoardPhoto.svelte';
	import ConfirmDialog from './ConfirmDialog.svelte';
	import EventCard from './EventCard.svelte';
	import NoticeCard from './NoticeCard.svelte';
	import type { OpenEvent } from '$lib/events/types';
	import { getApp, postedAt } from './state.svelte';
	import { choice, disclosure } from './ui';

	// Home's board, as on the kindergarten's corkboard: the photos of its classrooms' boards, then the notices a
	// teacher pinned to the top, the most recently pinned first, then every notice and event together, newest on
	// top. With several classrooms, a filter shows one classroom's; it starts on all of them. What a family hid on
	// this device waits folded away at the bottom.
	let { locale }: { locale: Locale } = $props();
	const app = getApp();
	const t = $derived(messages[locale].app);
	const id = $props.id();
	const classrooms = $derived(app.myClassrooms);
	/** The classroom chosen in the filter, or '' for all of them. */
	let chosen = $state('');
	// A classroom the device no longer belongs to leaves the filter on all.
	const shown = $derived(classrooms.some((classroom) => classroom.id === chosen) ? chosen : '');
	/** The pinned notices first, then by when each went up or was last announced. */
	const order = (post: Notice | OpenEvent) => [
		'pinnedAt' in post && post.pinnedAt !== null ? post.pinnedAt : 0,
		postedAt(post)
	];
	const allPosts = $derived(
		[
			...app.board.filter((notice) => !shown || notice.classrooms.includes(shown)),
			...app.events.filter((event) => !shown || event.classroom === shown)
		].toSorted((a, b) => {
			const [pinA, atA] = order(a);
			const [pinB, atB] = order(b);
			return pinB - pinA || atB - atA;
		})
	);
	const posts = $derived(allPosts.filter((post) => !app.isHidden(post)));
	const hiddenPosts = $derived(allPosts.filter((post) => app.isHidden(post)));
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
	{#if app.eventsError}<p role="status" class="text-sm text-muted">{t.events.failed}</p>{/if}
	{#if posts.length}
		<ul class="grid gap-4">
			{#each posts as post (post.id)}
				<li>{@render card(post)}</li>
			{/each}
		</ul>
	{:else if !hiddenPosts.length}
		<p class="text-muted">
			{shown
				? t.notices.emptyClassroom
				: app.status === 'staff'
					? t.notices.emptyStaff
					: t.notices.empty}
		</p>
	{/if}

	{#if hiddenPosts.length}
		<details class="group">
			<summary class={disclosure}>
				<Icon name="eyeOff" class="size-4" />{t.notices.hidden(hiddenPosts.length)}
				<Icon
					name="chevronRight"
					class="size-4 transition-transform group-open:rotate-90 motion-reduce:transition-none"
				/>
			</summary>
			<div class="mt-2 grid gap-4">
				<p class="text-sm text-muted">{t.notices.hiddenHint}</p>
				{#each hiddenPosts as post (post.id)}
					{@render card(post)}
				{/each}
			</div>
		</details>
	{/if}
</div>

{#snippet card(post: Notice | OpenEvent)}
	{#if 'classrooms' in post}
		<NoticeCard {locale} notice={post} ondelete={() => (deleting = post)} />
	{:else}
		<EventCard {locale} event={post} />
	{/if}
{/snippet}

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
