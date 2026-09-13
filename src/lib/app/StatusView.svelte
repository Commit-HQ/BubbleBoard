<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { messages, type Locale } from '$lib/i18n';
	import { appPath } from '$lib/paths';
	import InstallPanel from './InstallPanel.svelte';
	import Panel from './Panel.svelte';
	import { getApp } from './state.svelte';
	import { button, buttonRow } from './ui';

	// What an app page shows until the device is ready for it. Prerendered pages show the loading state.
	let { locale }: { locale: Locale } = $props();
	const app = getApp();
	const t = $derived(messages[locale].app);
</script>

{#if app.status === 'loading'}
	<div class="my-auto grid justify-items-center gap-4 text-center">
		<p class="flex items-center gap-3 font-semibold text-muted" role="status">
			<span
				class="size-5 animate-spin rounded-full border-2 border-ink/15 border-t-accent motion-reduce:animate-none"
				aria-hidden="true"
			></span>
			{t.loading}
		</p>
		<noscript><p class="max-w-md text-muted">{t.noscript}</p></noscript>
	</div>
{:else if app.status === 'install'}
	<InstallPanel {locale} />
{:else if app.status === 'unsupported'}
	<Panel icon="alert" title={t.unsupported.title} copy={t.unsupported.copy} alert />
{:else if app.status === 'offline' || app.status === 'unreadable'}
	{@const problem = app.status === 'offline' ? t.offline : t.unreadable}
	<Panel icon="alert" title={problem.title} copy={problem.copy} alert>
		<div class={buttonRow}>
			<button class={button.primary} type="button" onclick={() => app.retry()}>
				<Icon name="refresh" class="size-4" />{t.offline.retry}
			</button>
		</div>
	</Panel>
{:else}
	<Panel icon="key" title={t.connectFirst.title} copy={t.connectFirst.copy}>
		<div class={buttonRow}>
			<a class={button.primary} href={appPath(locale)}>{t.connectFirst.action}</a>
		</div>
	</Panel>
{/if}
