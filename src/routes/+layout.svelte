<script lang="ts">
	import '@fontsource-variable/hanken-grotesk';
	import '@fontsource-variable/hedvig-letters-serif';
	import favicon from '$lib/assets/favicon.svg';
	import '$lib/styles/app.css';
	import { messages } from '$lib/i18n';
	let { children, data } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<meta name="theme-color" content="#faf7ff" />
</svelte:head>

<a
	class="fixed top-4 left-4 z-20 -translate-y-24 rounded-full bg-ink px-4 py-3 text-white focus:translate-y-0"
	href="#main">{messages[data.locale].skip}</a
>
{@render children()}
