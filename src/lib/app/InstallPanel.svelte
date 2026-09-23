<script lang="ts">
	import Icon, { type IconName } from '$lib/components/Icon.svelte';
	import IconTile from '$lib/components/IconTile.svelte';
	import { messages, type Locale } from '$lib/i18n';
	import { browser } from '$app/environment';
	import { chromeLink, safariLink } from '$lib/install';
	import Panel from './Panel.svelte';
	import { getApp } from './state.svelte';
	import { button, buttonRow } from './ui';

	// Installing BubbleBoard, which phones and tablets need before anything else (src/lib/install.ts). iPhone
	// and iPad add it from the Share menu. Chrome on Android uses its install prompt where it offers one, and
	// its menu otherwise: Chrome offers the prompt only to sites whose service worker handles requests, and
	// BubbleBoard's handles only notifications. A browser that can't install, one inside another app or Brave,
	// gets a button that opens this page, card link and all, in Safari or Chrome, where the steps take over;
	// the other Android browsers get the same button as the way out when adding from their menu brings them
	// back here.
	let { locale }: { locale: Locale } = $props();
	const app = getApp();
	const t = $derived(messages[locale].app.install);
	let installed = $state(false);
	/** This page's address, with the card link the browser was opened with (src/lib/app/state.svelte.ts). */
	const link = browser ? location.href : '';
	const toChrome = link ? chromeLink(link) : '';
	const toSafari = link ? safariLink(link) : '';

	async function install() {
		const prompt = app.installPrompt;
		if (!prompt) return;
		await prompt.prompt();
		installed = (await prompt.userChoice).outcome === 'accepted';
		app.installPrompt = undefined;
	}
</script>

{#snippet steps(list: [IconName, string][])}
	<ol class="mt-8 grid gap-4">
		{#each list as [icon, step] (step)}
			<li class="flex items-center gap-4">
				<IconTile {icon} tone="white" />
				<span class="font-semibold">{step}</span>
			</li>
		{/each}
	</ol>
{/snippet}

{#snippet open(href: string, label: string, note: string)}
	<div class={buttonRow}>
		<a class={button.primary} {href}><Icon name="globe" class="size-4" />{label}</a>
	</div>
	<p class="mt-4 max-w-md text-muted">{note}</p>
{/snippet}

{#if app.install === 'ios-in-app'}
	<Panel icon="phone" title={t.safariTitle} copy={t.safariCopy}>
		{@render open(toSafari, t.openSafari, t.safariMenu)}
	</Panel>
{:else if app.install === 'ios'}
	<Panel icon="phone" title={t.iosTitle} copy={t.iosCopy}>
		{@render steps([
			['share', t.iosShare],
			['plusSquare', t.iosAdd],
			['phone', t.iosOpen]
		])}
		<p class="mt-8 max-w-md text-muted">
			{t.iosNoAdd}
			<a class="font-semibold text-ink underline" href={toSafari}>{t.openSafari}</a>
		</p>
	</Panel>
{:else if app.install === 'android-in-app'}
	<Panel icon="phone" title={t.chromeTitle} copy={t.chromeCopy}>
		{@render open(toChrome, t.openChrome, t.chromeMenu)}
	</Panel>
{:else}
	<Panel icon="phone" title={t.androidTitle} copy={installed ? t.installed : t.androidCopy}>
		{#if app.installPrompt}
			<div class={buttonRow}>
				<button class={button.primary} type="button" onclick={install}>
					<Icon name="plusSquare" class="size-4" />{t.install}
				</button>
			</div>
		{:else if !installed}
			{@render steps([
				['moreVertical', t.androidMenu],
				['plusSquare', t.androidAdd],
				['phone', t.androidOpen]
			])}
		{/if}
		{#if app.install === 'android-other'}
			<p class="mt-8 max-w-md text-muted">
				{t.androidStuck}
				<a class="font-semibold text-ink underline" href={toChrome}>{t.openChrome}</a>
			</p>
		{/if}
	</Panel>
{/if}
