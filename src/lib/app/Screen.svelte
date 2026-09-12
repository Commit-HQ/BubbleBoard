<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { messages, type Locale } from '$lib/i18n';
	import { appPath } from '$lib/paths';
	import type { Snippet } from 'svelte';
	import Panel from './Panel.svelte';
	import { getApp } from './state.svelte';
	import StatusView from './StatusView.svelte';
	import { button, buttonRow } from './ui';

	// The frame of an app page below home: a way back, a title, and the page once this device may see it.
	let {
		locale,
		title,
		subtitle,
		back,
		need = 'staff',
		children
	}: {
		locale: Locale;
		title: string;
		subtitle?: string;
		back?: { href: string; label: string };
		need?: 'anyone' | 'staff' | 'admin';
		children: Snippet;
	} = $props();

	const app = getApp();
	const t = $derived(messages[locale].app);
</script>

{#snippet home()}
	<div class={buttonRow}>
		<a class={button.secondary} href={appPath(locale)}>{t.home.title}</a>
	</div>
{/snippet}

{#if app.mustInstall}
	<StatusView {locale} />
{:else if app.status === 'family' && need !== 'anyone'}
	<Panel icon="smile" title={t.staffOnly.title} copy={t.staffOnly.copy} children={home} />
{:else if app.status === 'staff' && need === 'admin' && !app.admin}
	<Panel icon="lock" title={t.adminOnly.title} copy={t.adminOnly.copy} children={home} />
{:else if app.connected}
	<div class="grid gap-6">
		<header class="print:hidden">
			<a class="{button.quiet} -ml-3" href={back?.href ?? appPath(locale)}>
				<Icon name="chevronLeft" class="size-4" />{back?.label ?? t.home.title}
			</a>
			<h1 class="mt-2 text-4xl sm:text-5xl">{title}</h1>
			{#if subtitle}<p class="mt-2 text-lg text-muted">{subtitle}</p>{/if}
		</header>
		{@render children()}
	</div>
{:else}
	<StatusView {locale} />
{/if}
