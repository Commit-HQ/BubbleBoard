<script lang="ts">
	import { goto } from '$app/navigation';
	import NoticeForm from '$lib/app/NoticeForm.svelte';
	import Screen from '$lib/app/Screen.svelte';
	import { getApp } from '$lib/app/state.svelte';
	import { queryParam } from '$lib/app/ui';
	import { messages } from '$lib/i18n';
	import { appPath } from '$lib/paths';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const app = getApp();
	const t = $derived(messages[data.locale].app);
	const id = $derived(queryParam('id'));
	const notice = $derived(app.board.find((candidate) => candidate.id === id));
</script>

<Screen locale={data.locale} title={notice ? t.notices.editTitle : t.notFound.title}>
	{#if notice && app.canChange(notice)}
		{#key notice.id}
			<NoticeForm locale={data.locale} {notice} onsaved={() => goto(appPath(data.locale))} />
		{/key}
	{:else}
		<p class="text-muted">{t.notFound.copy}</p>
	{/if}
</Screen>
