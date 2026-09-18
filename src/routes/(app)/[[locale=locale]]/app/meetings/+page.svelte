<script lang="ts">
	import Screen from '$lib/app/Screen.svelte';
	import Meetings from '$lib/app/Meetings.svelte';
	import { messages } from '$lib/i18n';
	import type { PageProps } from './$types';
	let { data }: PageProps = $props();
</script>

<Screen locale={data.locale} title={messages[data.locale].app.meetings.title} need="connected">
	<Meetings locale={data.locale} />
</Screen>
