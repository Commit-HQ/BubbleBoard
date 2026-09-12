<script lang="ts">
	import { goto } from '$app/navigation';
	import NoticeForm from '$lib/app/NoticeForm.svelte';
	import Screen from '$lib/app/Screen.svelte';
	import { messages } from '$lib/i18n';
	import { appPath } from '$lib/paths';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const t = $derived(messages[data.locale].app.notices);
</script>

<Screen locale={data.locale} title={t.newTitle}>
	<NoticeForm locale={data.locale} onsaved={() => goto(appPath(data.locale))} />
</Screen>
