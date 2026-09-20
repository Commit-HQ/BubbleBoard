<script lang="ts">
	import EventPhotoEditor from '$lib/app/EventPhotoEditor.svelte';
	import Screen from '$lib/app/Screen.svelte';
	import { messages } from '$lib/i18n';
	import type { PageProps } from './$types';
	let { data }: PageProps = $props();
</script>

<Screen locale={data.locale} title={messages[data.locale].app.events.new}>
	<EventPhotoEditor locale={data.locale} />
</Screen>
