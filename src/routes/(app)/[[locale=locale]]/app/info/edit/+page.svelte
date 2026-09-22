<script lang="ts">
	import { goto } from '$app/navigation';
	import InfoPageForm from '$lib/app/InfoPageForm.svelte';
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
	const page = $derived(app.infoPages.find((candidate) => candidate.id === id));
	const back = $derived(appPath(data.locale, 'info'));
</script>

<Screen locale={data.locale} title={page ? t.info.editTitle : t.notFound.title} {back} need="head">
	{#if page}
		{#key page.id}
			<InfoPageForm locale={data.locale} {page} onsaved={() => goto(back)} />
		{/key}
	{:else}
		<p class="text-muted">{t.notFound.copy}</p>
	{/if}
</Screen>
