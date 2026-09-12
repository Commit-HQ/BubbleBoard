<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import favicon from '$lib/assets/favicon.svg';
	import { App, setApp } from '$lib/app/state.svelte';
	import BuildLabel from '$lib/components/BuildLabel.svelte';
	import LanguageSwitch from '$lib/components/LanguageSwitch.svelte';
	import { messages } from '$lib/i18n';
	import { appPath, homePath } from '$lib/paths';
	import { tick } from 'svelte';
	import type { LayoutProps } from './$types';

	let { children, data }: LayoutProps = $props();
	const t = $derived(messages[data.locale]);
	// One state for every app page, kept while moving between pages and languages. Starting removes a
	// card from the address bar, which needs the router: it's ready just after the first navigation's
	// callbacks, so the start waits a tick.
	const app = setApp(new App());
	afterNavigate(({ type }) => {
		if (type === 'enter') tick().then(() => app.start());
	});
</script>

<svelte:window onhashchange={() => app.useCardLink()} />

<svelte:head>
	<!-- A plain title: tab titles and browser history shouldn't hold children's or families' names. -->
	<title>BubbleBoard</title>
	<!-- Search results should lead to the landing page, not to pages that need a card. -->
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="mx-auto flex min-h-dvh max-w-2xl flex-col px-4 sm:px-8 print:max-w-none print:px-0">
	<header
		class="sticky top-3 z-10 my-3 flex items-center justify-between gap-4 rounded-full frosted py-1.5 pr-1.5 pl-3 print:hidden"
	>
		<a
			class="inline-flex items-center gap-2.5 text-xl font-bold tracking-tight"
			href={appPath(data.locale)}
		>
			<img src={favicon} alt="" width="36" height="36" />
			<!-- Enlarged text on a phone narrows the page below 20rem; then only the logo shows. -->
			<span class="max-[20rem]:sr-only">BubbleBoard</span>
		</a>
		<LanguageSwitch locale={data.locale} />
	</header>

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
