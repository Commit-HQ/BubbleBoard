<script lang="ts">
	import { messages, type Locale } from '$lib/i18n';
	import type { Notice } from '$lib/notices';
	import ConfirmDialog from './ConfirmDialog.svelte';
	import NoticeCard from './NoticeCard.svelte';
	import { getApp } from './state.svelte';

	// Home's notices, newest on top, as on the kindergarten's corkboard.
	let { locale, empty }: { locale: Locale; empty: string } = $props();
	const app = getApp();
	const t = $derived(messages[locale].app.notices);
	let deleting = $state.raw<Notice>();

	async function remove(notice: Notice) {
		await app.deleteNotice(notice);
		deleting = undefined;
	}
</script>

{#if app.unreadableNotices}
	<p class="text-sm font-semibold text-muted">{t.unreadable}</p>
{/if}
{#if app.board.length}
	<ul class="grid gap-4">
		{#each app.board as notice (notice.id)}
			<li><NoticeCard {locale} {notice} ondelete={() => (deleting = notice)} /></li>
		{/each}
	</ul>
{:else}
	<p class="text-muted">{empty}</p>
{/if}

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
