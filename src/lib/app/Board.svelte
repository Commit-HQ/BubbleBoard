<script lang="ts">
	import { messages, type Locale } from '$lib/i18n';
	import type { Notice } from '$lib/notices';
	import ConfirmDialog from './ConfirmDialog.svelte';
	import NoticeCard from './NoticeCard.svelte';
	import { getApp } from './state.svelte';

	// Home's notices, newest on top, as on the kindergarten's corkboard. With several classrooms, a filter
	// shows one classroom's notices; it starts on all of them.
	let {
		locale,
		classrooms,
		empty
	}: { locale: Locale; classrooms: { id: string; name: string }[]; empty: string } = $props();
	const app = getApp();
	const t = $derived(messages[locale].app.notices);
	const id = $props.id();
	/** The classroom chosen in the filter, or '' for all of them. */
	let chosen = $state('');
	// A classroom the device no longer belongs to leaves the filter on all.
	const shown = $derived(classrooms.some((classroom) => classroom.id === chosen) ? chosen : '');
	const notices = $derived(
		shown ? app.board.filter((notice) => notice.classrooms.includes(shown)) : app.board
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
			<legend class="sr-only">{t.show}</legend>
			<div class="flex flex-wrap gap-2">
				{#each [{ id: '', name: t.all }, ...classrooms] as option (option.id)}
					<!-- Forced colours drop the dark fill, so the chosen classroom is underlined there instead. -->
					<label
						class="inline-flex min-h-11 cursor-pointer items-center rounded-full border border-ink/10 bg-white/60 px-4 font-semibold transition hover:bg-white has-checked:border-ink has-checked:bg-ink has-checked:text-white has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent forced-colors:has-checked:underline"
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

	{#if app.unreadableNotices}
		<p class="text-sm font-semibold text-muted">{t.unreadable}</p>
	{/if}
	{#if notices.length}
		<ul class="grid gap-4">
			{#each notices as notice (notice.id)}
				<li><NoticeCard {locale} {notice} ondelete={() => (deleting = notice)} /></li>
			{/each}
		</ul>
	{:else}
		<p class="text-muted">{shown ? t.emptyClassroom : empty}</p>
	{/if}
</div>

{#if deleting}
	{@const notice = deleting}
	<ConfirmDialog
		{locale}
		title={t.deleteTitle}
		copy={t.deleteCopy}
		confirmLabel={t.delete}
		danger
		onconfirm={() => remove(notice)}
		onclose={() => (deleting = undefined)}
	/>
{/if}
