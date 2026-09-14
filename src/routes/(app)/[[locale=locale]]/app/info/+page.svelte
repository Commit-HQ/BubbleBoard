<script lang="ts">
	import Attachments from '$lib/app/Attachments.svelte';
	import NoticeBody from '$lib/app/NoticeBody.svelte';
	import Screen from '$lib/app/Screen.svelte';
	import { getApp } from '$lib/app/state.svelte';
	import { button, paperClass } from '$lib/app/ui';
	import Icon from '$lib/components/Icon.svelte';
	import { formatDateTime, messages } from '$lib/i18n';
	import { isBlank } from '$lib/info';
	import { appPath } from '$lib/paths';
	import type { PageProps } from './$types';

	// The kindergarten's info page, from the header of every connected device: what everyone who uses the app should
	// know, on plain paper, with its files. Admins write and change it from here; until they do, it says so.
	let { data }: PageProps = $props();
	const app = getApp();
	const t = $derived(messages[data.locale].app.info);
	/** The page, when it shows something. */
	const info = $derived(app.info && !isBlank(app.info) ? app.info : undefined);
</script>

<Screen locale={data.locale} title={t.title} need="connected">
	{#if info}
		<article
			class="rounded-3xl p-5 text-ink shadow-lg ring-1 shadow-ink/5 ring-ink/5 sm:p-6 {paperClass.white}"
		>
			<NoticeBody blocks={info.body.content} />
			{#if info.files?.length}
				<div class="mt-5">
					<Attachments
						locale={data.locale}
						files={info.files}
						openPicture={(file) => app.infoPicture(file)}
						saveDocument={(file) => app.saveInfoFile(file)}
					/>
				</div>
			{/if}
			<p class="mt-5 text-sm text-muted">
				{t.updated(formatDateTime(data.locale, info.editedAt))}
			</p>
		</article>
	{:else}
		<p class="text-muted">
			{app.unreadableInfo ? t.unreadable : app.admin ? t.emptyAdmin : t.empty}
		</p>
	{/if}
	{#if app.admin}
		<a
			class="{app.info ? button.secondary : button.primary} justify-self-start"
			href={appPath(data.locale, 'info/edit')}
		>
			<Icon name="pencil" class="size-4" />{app.info ? t.edit : t.add}
		</a>
	{/if}
</Screen>
