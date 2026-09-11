<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import '$lib/styles/app.css';
	import { messages } from '$lib/i18n';
	let { children, data } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<meta name="theme-color" content="#e1f5fa" />
</svelte:head>

<a class="skip-link" href="#main">{messages[data.locale].skip}</a>
{@render children()}
