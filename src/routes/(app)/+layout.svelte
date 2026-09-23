<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import { page, updated } from '$app/state';
	import PullToRefresh from '$lib/app/PullToRefresh.svelte';
	import { App, setApp } from '$lib/app/state.svelte';
	import BuildLabel from '$lib/components/BuildLabel.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import LanguageSwitch from '$lib/components/LanguageSwitch.svelte';
	import SiteHeader from '$lib/components/SiteHeader.svelte';
	import { locales, messages } from '$lib/i18n';
	import { appPath, homePath, localizedPath } from '$lib/paths';
	import { onMount, tick } from 'svelte';
	import type { LayoutProps } from './$types';

	let { children, data }: LayoutProps = $props();
	const t = $derived(messages[data.locale]);
	// One state for every app page, kept while moving between pages and languages. Starting takes a card
	// or setup token from the address bar, which needs the router: it's ready just after the first
	// navigation's callbacks, so the start waits a tick.
	const app = setApp(new App());
	afterNavigate(({ type }) => {
		if (type === 'enter') tick().then(() => app.start());
		// A new deploy found while a page was half written (`backInView`) is loaded on arrival at the next
		// page, once that page's own question on the way out, if any, is behind.
		else if (updated.current) location.reload();
	});
	// The service worker says when a notification comes or is tapped, and what about (src/service-worker.ts),
	// so what's new shows straight away when the app is open in view, or once it's back in view
	// (`App.refresh`). A message changes only the conversations, so only they load again.
	onMount(() => {
		const container = navigator.serviceWorker;
		if (!container) return;
		const reload = ({ data }: MessageEvent) => {
			if (data?.type !== 'push') return;
			if (data.kind === 'message') {
				if (app.connected) app.loadMessages();
			} else app.refresh({ now: true });
		};
		container.addEventListener('message', reload);
		container.startMessages();
		return () => container.removeEventListener('message', reload);
	});

	// An installed app can stay open for weeks, so back in view it asks whether a new version has been
	// deployed since it loaded. If so, the board loads the new one straight away, and any other page, where
	// something may be half written, on arrival at the next page (`afterNavigate` above).
	async function backInView() {
		app.refresh();
		if (document.visibilityState !== 'visible' || !(await updated.check())) return;
		if (page.url.pathname === appPath(data.locale)) location.reload();
	}

	const inbox = $derived(appPath(data.locale, 'messages'));
	const manage = $derived(appPath(data.locale, 'manage'));
	const info = $derived(appPath(data.locale, 'info'));
	const options = $derived(appPath(data.locale, 'options'));
	// Until a device connects, Settings would hold only the language, so the header has the language switch
	// instead, as on the landing page. While the app starts, the header has Settings, since most devices that
	// open the app are connected.
	const settings = $derived(app.connected || app.status === 'loading');
	const staff = $derived(app.status === 'staff');
	// Messages, the kindergarten's info, Manage on a staff device, and Settings: what the name shares the
	// header with, and so how narrow the header can get before the name gives way to the logo.
	const headerLinks = $derived(settings ? (staff ? 4 : 3) : 0);
	const current = (href: string) => (page.url.pathname === href ? 'page' : undefined);
	const headerLink =
		'inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-ink/5 font-semibold transition-colors hover:bg-ink/10 aria-[current=page]:bg-ink aria-[current=page]:text-white';
</script>

<svelte:window onhashchange={() => app.openLink()} />
<!-- Back in view, such as after a tap on a notification, or pulled down from the top, the app loads
everything again. -->
<svelte:document onvisibilitychange={backInView} />
<PullToRefresh />

<svelte:head>
	<!-- A plain title: tab titles and browser history shouldn't hold children's or families' names. -->
	<title>BubbleBoard</title>
	<!-- Search results should lead to the landing page, not to pages that need a card. -->
	<meta name="robots" content="noindex" />
	<!-- The page in each language. Prerendering follows these links, which is how it finds each page's
	other language: prerendered pages show the app starting, whose header has no language switch. -->
	{#each locales as option (option)}
		<link rel="alternate" hreflang={option} href={localizedPath(page.url.pathname, option)} />
	{/each}
	<!-- Installing: the app's manifest in this page's language, and the Home Screen icon on iPhone and iPad. -->
	<link rel="manifest" href="{appPath(data.locale)}/manifest.webmanifest" />
	<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
</svelte:head>

<div class="mx-auto flex min-h-dvh max-w-2xl flex-col px-4 sm:px-8 print:max-w-none print:px-0">
	<SiteHeader href={appPath(data.locale)} links={headerLinks} class="print:hidden">
		{#if settings}
			<!-- Messages, the kindergarten's info, what staff manage, and Settings, on every page. Each is an
			icon with a label for screen readers and a tooltip: with four of them, words would leave the
			narrowest phones no room for the logo. Messages carries how many conversations have something new. -->
			<nav class="flex items-center gap-1" aria-label={t.nav.label}>
				<a
					class="{headerLink} relative w-11"
					href={inbox}
					title={t.app.messaging.title}
					aria-label={t.app.messaging.title}
					aria-current={current(inbox)}
				>
					<Icon name="message" />
					{#if app.unreadConversations}
						<span
							class="absolute -top-0.5 -right-0.5 grid min-w-5 place-items-center rounded-full bg-accent px-1 text-xs font-bold text-white ring-2 ring-canvas"
							>{app.unreadConversations}</span
						>
					{/if}
				</a>
				<a
					class="{headerLink} w-11"
					href={info}
					title={t.app.info.title}
					aria-label={t.app.info.title}
					aria-current={current(info)}
				>
					<Icon name="info" />
				</a>
				{#if staff}
					<a
						class="{headerLink} w-11"
						href={manage}
						title={t.app.manage.title}
						aria-label={t.app.manage.title}
						aria-current={current(manage)}
					>
						<Icon name="dashboard" />
					</a>
				{/if}
				<a
					class="{headerLink} w-11"
					href={options}
					title={t.app.options.title}
					aria-label={t.app.options.title}
					aria-current={current(options)}
				>
					<Icon name="settings" />
				</a>
			</nav>
		{:else}
			<LanguageSwitch locale={data.locale} />
		{/if}
	</SiteHeader>

	<main id="main" class="flex grow flex-col pt-6 pb-8 sm:pt-8">
		{@render children()}
	</main>

	<footer
		class="flex flex-wrap justify-between gap-x-6 gap-y-2 px-2 pb-6 text-sm text-muted print:hidden"
	>
		<!-- In a window of its own: the installed app has no way back from the landing pages. -->
		<a
			class="hover:text-ink"
			href={homePath(data.locale)}
			target="_blank"
			rel="noopener noreferrer"
		>
			<span aria-hidden="true">🫧</span>
			{t.app.about}
		</a>
		<BuildLabel locale={data.locale} />
	</footer>
</div>
