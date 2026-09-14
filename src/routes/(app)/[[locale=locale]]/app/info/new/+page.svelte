<script lang="ts">
	import { goto } from '$app/navigation';
	import InfoPageForm from '$lib/app/InfoPageForm.svelte';
	import Screen from '$lib/app/Screen.svelte';
	import { messages } from '$lib/i18n';
	import { appPath } from '$lib/paths';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const t = $derived(messages[data.locale].app.info);
	const back = $derived(appPath(data.locale, 'info'));
</script>

<Screen locale={data.locale} title={t.newTitle} {back} need="admin">
	<InfoPageForm locale={data.locale} onsaved={() => goto(back)} />
</Screen>
