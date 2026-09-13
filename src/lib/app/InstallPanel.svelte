<script lang="ts">
	import Icon, { type IconName } from '$lib/components/Icon.svelte';
	import IconTile from '$lib/components/IconTile.svelte';
	import { messages, type Locale } from '$lib/i18n';
	import Panel from './Panel.svelte';
	import { getApp } from './state.svelte';
	import { button, buttonRow } from './ui';

	// Installing BubbleBoard, which phones and tablets need before anything else (src/lib/install.ts). iPhone
	// and iPad add it from the Share menu. Android uses the browser's install prompt where the browser
	// offers one, and its menu otherwise: Chrome offers the prompt only to sites whose service worker handles
	// requests, and BubbleBoard's handles only notifications.
	let { locale }: { locale: Locale } = $props();
	const app = getApp();
	const t = $derived(messages[locale].app.install);
	let installed = $state(false);

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

{#if app.install === 'in-app'}
	<Panel icon="phone" title={t.inAppTitle} copy={t.inAppCopy} />
{:else if app.install === 'ios'}
	<Panel icon="phone" title={t.iosTitle} copy={t.iosCopy}>
		{@render steps([
			['share', t.iosShare],
			['plusSquare', t.iosAdd],
			['phone', t.iosOpen]
		])}
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
	</Panel>
{/if}
