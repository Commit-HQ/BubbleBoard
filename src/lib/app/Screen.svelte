<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { messages, type Locale } from '$lib/i18n';
	import { appPath } from '$lib/paths';
	import type { Snippet } from 'svelte';
	import FieldForm from './FieldForm.svelte';
	import Panel from './Panel.svelte';
	import { getApp } from './state.svelte';
	import StatusView from './StatusView.svelte';
	import { button, buttonRow, surface } from './ui';

	// The frame of an app page below home: a way back, a title, and the page once this device may see it.
	// `need` is what the device must be: staff, an admin, or nothing, for settings. With `rename`, a pencil
	// beside the title opens a field that renames what the title names.
	let {
		locale,
		title,
		subtitle,
		back,
		need = 'staff',
		rename,
		children
	}: {
		locale: Locale;
		title: string;
		subtitle?: string;
		back?: { href: string; label: string };
		need?: 'nothing' | 'staff' | 'admin';
		rename?: { label: string; save: (name: string) => Promise<unknown> };
		children: Snippet;
	} = $props();

	const app = getApp();
	const t = $derived(messages[locale].app);
	const id = $props.id();
	let renaming = $state(false);

	async function save(name: string) {
		await rename?.save(name);
		renaming = false;
	}
</script>

{#snippet home()}
	<div class={buttonRow}>
		<a class={button.secondary} href={appPath(locale)}>{t.home.title}</a>
	</div>
{/snippet}

{#snippet content()}
	<div class="grid gap-6">
		<header class="print:hidden">
			<a class="{button.quiet} -ml-3" href={back?.href ?? appPath(locale)}>
				<Icon name="chevronLeft" class="size-4" />{back?.label ?? t.home.title}
			</a>
			{#if rename && renaming}
				<h1 class="sr-only">{title}</h1>
				<div class="{surface} mt-2">
					<FieldForm
						{locale}
						label={rename.label}
						value={title}
						submitLabel={t.actions.save}
						onsubmit={save}
						oncancel={() => (renaming = false)}
					/>
				</div>
			{:else}
				<div class="mt-2 flex items-start gap-1">
					<h1 id="{id}-title" class="min-w-0 text-4xl sm:text-5xl">{title}</h1>
					{#if rename}
						<button
							class="{button.icon} -mt-1.5"
							type="button"
							aria-label={t.actions.rename}
							aria-describedby="{id}-title"
							onclick={() => (renaming = true)}
						>
							<Icon name="pencil" class="size-4" />
						</button>
					{/if}
				</div>
			{/if}
			{#if subtitle}<p class="mt-2 text-lg text-muted">{subtitle}</p>{/if}
		</header>
		{@render children()}
	</div>
{/snippet}

{#if need === 'nothing'}
	{@render content()}
{:else if app.mustInstall}
	<StatusView {locale} />
{:else if app.status === 'family'}
	<Panel icon="smile" title={t.staffOnly.title} copy={t.staffOnly.copy} children={home} />
{:else if app.status === 'staff' && need === 'admin' && !app.admin}
	<Panel icon="lock" title={t.adminOnly.title} copy={t.adminOnly.copy} children={home} />
{:else if app.connected}
	{@render content()}
{:else}
	<StatusView {locale} />
{/if}
