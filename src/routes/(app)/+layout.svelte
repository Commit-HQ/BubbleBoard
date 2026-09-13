<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import { App, setApp } from '$lib/app/state.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import SiteHeader from '$lib/components/SiteHeader.svelte';
	import { locales, messages } from '$lib/i18n';
	import { appPath, localizedPath } from '$lib/paths';
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

	const manage = $derived(appPath(data.locale, 'manage'));
	const options = $derived(appPath(data.locale, 'options'));
	const current = (href: string) => (page.url.pathname === href ? 'page' : undefined);
	const headerLink =
		'inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-ink/5 font-semibold transition-colors hover:bg-ink/10 aria-[current=page]:bg-ink aria-[current=page]:text-white';
</script>

<svelte:window onhashchange={() => app.openLink()} />
<!-- Back in view, such as after a tap on a notification, the app loads the board again. -->
<svelte:document
	onvisibilitychange={() => document.visibilityState === 'visible' && app.refresh()}
/>

<svelte:head>
	<!-- A plain title: tab titles and browser history shouldn't hold children's or families' names. -->
	<title>BubbleBoard</title>
	<!-- Search results should lead to the landing page, not to pages that need a card. -->
	<meta name="robots" content="noindex" />
	<!-- The page in each language. Prerendering follows these links, which is how it finds each page's
	other language now that the language switch is only in Settings. -->
	{#each locales as option (option)}
		<link rel="alternate" hreflang={option} href={localizedPath(page.url.pathname, option)} />
	{/each}
	<!-- Installing: the app's manifest in this page's language, and the Home Screen icon on iPhone and iPad. -->
	<link rel="manifest" href="{appPath(data.locale)}/manifest.webmanifest" />
	<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
</svelte:head>

<div class="mx-auto flex min-h-dvh max-w-2xl flex-col px-4 sm:px-8 print:max-w-none print:px-0">
	<SiteHeader href={appPath(data.locale)} class="print:hidden">
		<!-- Staff manage the kindergarten from here. Settings, which hold the language, are here on every
		page, even before a device connects. On phones, Manage shows only its icon. -->
		<nav class="flex items-center gap-1.5" aria-label={t.nav.label}>
			{#if app.status === 'staff' && !app.mustInstall}
				<a class="{headerLink} px-3 sm:px-4" href={manage} aria-current={current(manage)}>
					<Icon name="dashboard" />
					<span class="max-sm:sr-only">{t.app.manage.title}</span>
				</a>
			{/if}
			<a
				class="{headerLink} w-11"
				href={options}
				aria-label={t.app.options.title}
				aria-current={current(options)}
			>
				<Icon name="settings" />
			</a>
		</nav>
	</SiteHeader>

	<main id="main" class="flex grow flex-col pt-6 pb-12 sm:pt-8">
		{@render children()}
	</main>
</div>
