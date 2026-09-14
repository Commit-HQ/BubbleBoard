<script lang="ts">
	import ConfirmDialog from '$lib/app/ConfirmDialog.svelte';
	import InfoPageCard from '$lib/app/InfoPageCard.svelte';
	import Screen from '$lib/app/Screen.svelte';
	import { getApp } from '$lib/app/state.svelte';
	import { button } from '$lib/app/ui';
	import Icon from '$lib/components/Icon.svelte';
	import { messages } from '$lib/i18n';
	import { maxInfoPages, type InfoPage } from '$lib/info';
	import { appPath } from '$lib/paths';
	import type { PageProps } from './$types';

	// The kindergarten's info, from the header of every connected device: pages of what everyone who uses the app
	// should know, each on its paper with its files, in the order admins put them in. Admins add pages here, and
	// change, move, and delete each; until there's one, the page says so.
	let { data }: PageProps = $props();
	const app = getApp();
	const t = $derived(messages[data.locale].app.info);
	const pages = $derived(app.infoPages);
	let deleting = $state.raw<InfoPage>();

	async function remove(page: InfoPage) {
		await app.deleteInfoPage(page);
		deleting = undefined;
	}
</script>

<Screen locale={data.locale} title={t.title} need="connected">
	{#if app.admin && pages.length + app.unreadableInfoPages < maxInfoPages}
		<a class="{button.primary} justify-self-start" href={appPath(data.locale, 'info/new')}>
			<Icon name="plus" class="size-4" />{t.add}
		</a>
	{/if}
	{#if app.unreadableInfoPages}
		<p class="text-sm font-semibold text-muted">{t.unreadable}</p>
	{/if}
	{#if pages.length}
		<ul class="grid gap-4">
			{#each pages as page, index (page.id)}
				<li>
					<InfoPageCard
						locale={data.locale}
						{page}
						first={index === 0}
						last={index === pages.length - 1}
						ondelete={() => (deleting = page)}
					/>
				</li>
			{/each}
		</ul>
	{:else if !app.unreadableInfoPages}
		<p class="text-muted">{app.admin ? t.emptyAdmin : t.empty}</p>
	{/if}
</Screen>

{#if deleting}
	{@const page = deleting}
	<ConfirmDialog
		locale={data.locale}
		title={t.deleteTitle}
		copy={t.deleteCopy}
		confirmLabel={t.delete}
		danger
		onconfirm={() => remove(page)}
		onclose={() => (deleting = undefined)}
	/>
{/if}
