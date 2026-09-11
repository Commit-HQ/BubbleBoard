<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import '$lib/styles/app.css';
	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<meta name="theme-color" content="#245bea" />
</svelte:head>

<a class="skip-link" href="#main">Skip to content</a>
{@render children()}
