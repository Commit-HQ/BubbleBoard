<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { errorMessage, formatDateTime, messages, type Locale } from '$lib/i18n';
	import type { InfoPage } from '$lib/info';
	import { appPath } from '$lib/paths';
	import Attachments from './Attachments.svelte';
	import NoticeBody from './NoticeBody.svelte';
	import { getApp, Task } from './state.svelte';
	import { alert, button, paperClass } from './ui';

	// One of the kindergarten's info pages, on its paper, with its pictures and documents and when it was last
	// updated. Admins also edit or delete it here, and move it up or down among the pages.
	let {
		locale,
		page,
		first,
		last,
		ondelete
	}: {
		locale: Locale;
		page: InfoPage;
		/** Whether it's the first page, which can't move up, or the last, which can't move down. */
		first: boolean;
		last: boolean;
		ondelete: () => void;
	} = $props();
	const app = getApp();
	const t = $derived(messages[locale].app.info);
	const task = new Task();
</script>

<article
	class="rounded-3xl p-5 text-ink shadow-lg ring-1 shadow-ink/5 ring-ink/5 sm:p-6 {paperClass[
		page.paper
	]}"
>
	<NoticeBody blocks={page.body.content} />
	{#if page.files?.length}
		<div class="mt-5">
			<Attachments
				{locale}
				files={page.files}
				openPicture={(file) => app.infoPicture(page, file)}
				saveDocument={(file) => app.saveInfoFile(page, file)}
			/>
		</div>
	{/if}
	<p class="mt-5 text-sm text-muted">{t.updated(formatDateTime(locale, page.editedAt))}</p>

	{#if app.admin}
		<div class="mt-4 -ml-3 flex flex-wrap items-center gap-2">
			<a class={button.quiet} href={appPath(locale, 'info/edit', { id: page.id })}>
				<Icon name="pencil" class="size-4" />{t.edit}
			</a>
			<button class={button.danger} type="button" onclick={ondelete}>
				<Icon name="trash" class="size-4" />{t.delete}
			</button>
			<div class="ml-auto flex gap-1">
				{#if !first}
					<button
						class={button.icon}
						type="button"
						aria-label={t.moveUp}
						title={t.moveUp}
						disabled={task.busy}
						onclick={() => task.run(() => app.moveInfoPage(page, -1))}
					>
						<Icon name="arrowUp" />
					</button>
				{/if}
				{#if !last}
					<button
						class={button.icon}
						type="button"
						aria-label={t.moveDown}
						title={t.moveDown}
						disabled={task.busy}
						onclick={() => task.run(() => app.moveInfoPage(page, 1))}
					>
						<Icon name="arrowDown" />
					</button>
				{/if}
			</div>
		</div>
		{#if task.error}
			<p class="{alert} mt-3" role="alert">{errorMessage(locale, task.error)}</p>
		{/if}
	{/if}
</article>
