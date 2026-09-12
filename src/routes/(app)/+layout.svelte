<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import { App, setApp } from '$lib/app/state.svelte';
	import BuildLabel from '$lib/components/BuildLabel.svelte';
	import SiteHeader from '$lib/components/SiteHeader.svelte';
	import { messages } from '$lib/i18n';
	import { appPath, homePath } from '$lib/paths';
	import { tick } from 'svelte';
	import type { LayoutProps } from './$types';

	let { children, data }: LayoutProps = $props();
	const t = $derived(messages[data.locale]);
	// One state for every app page, kept while moving between pages and languages. Starting takes a card
	// or setup token from the address bar, which needs the router: it's ready just after the first
	// navigation's callbacks, so the start waits a tick.
	const app = setApp(new App());
	afterNavigate(({ type }) => {
		if (type === 'enter') tick().then(() => app.start());
	});
</script>

<svelte:window onhashchange={() => app.openLink()} />

<svelte:head>
	<!-- A plain title: tab titles and browser history shouldn't hold children's or families' names. -->
	<title>BubbleBoard</title>
	<!-- Search results should lead to the landing page, not to pages that need a card. -->
	<meta name="robots" content="noindex" />
	<!-- Installing: the app's manifest in this page's language, and the Home Screen icon on iPhone and iPad. -->
	<link rel="manifest" href="{appPath(data.locale)}/manifest.webmanifest" />
	<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
</svelte:head>

<div class="mx-auto flex min-h-dvh max-w-2xl flex-col px-4 sm:px-8 print:max-w-none print:px-0">
	<SiteHeader locale={data.locale} href={appPath(data.locale)} class="print:hidden" />

	<main id="main" class="flex grow flex-col py-6 sm:py-8">
		{@render children()}
	</main>

	<footer
		class="flex flex-wrap justify-between gap-x-6 gap-y-2 py-6 text-sm text-muted print:hidden"
	>
		<a class="hover:text-ink" href={homePath(data.locale)}>{t.app.about}</a>
		<BuildLabel locale={data.locale} />
	</footer>
</div>
