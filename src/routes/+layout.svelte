<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import '$lib/styles/app.css';
	import type { LayoutProps } from './$types';

	let { children, data }: LayoutProps = $props();

	// The server sets the document language for the first page. Pages that change language in the
	// browser, such as app pages, update it so screen readers pronounce the new language.
	$effect(() => {
		document.documentElement.lang = data.locale;
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<meta name="theme-color" content="#faf7ff" />
</svelte:head>

{@render children()}
