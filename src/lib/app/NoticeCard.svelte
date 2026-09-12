<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { listNames, messages, type Locale } from '$lib/i18n';
	import type { Notice } from '$lib/notices';
	import { appPath } from '$lib/paths';
	import NoticeBody from './NoticeBody.svelte';
	import { getApp } from './state.svelte';
	import { button, paperClass } from './ui';

	// One notice on the board, on its paper, with the actions its author or an admin may take.
	let { locale, notice, ondelete }: { locale: Locale; notice: Notice; ondelete: () => void } =
		$props();
	const app = getApp();
	const t = $derived(messages[locale].app.notices);
	const time = $derived(
		new Intl.DateTimeFormat(locale, {
			day: 'numeric',
			month: 'short',
			hour: 'numeric',
			minute: '2-digit'
		}).format(notice.announcedAt)
	);
</script>

<article
	class="rounded-3xl p-5 text-ink shadow-lg ring-1 shadow-ink/5 ring-ink/5 sm:p-6 {paperClass[
		notice.paper
	]}"
>
	<header class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm">
		<p class="font-semibold">{listNames(locale, app.classroomNames(notice.classrooms))}</p>
		<p class="text-muted">
			{notice.author ? t.byline(notice.author, time) : time}{notice.editedAt
				? ` · ${t.edited}`
				: ''}
		</p>
	</header>
	<div class="mt-3 text-lg leading-relaxed">
		<NoticeBody blocks={notice.body.content} />
	</div>
	{#if app.canChange(notice)}
		<div class="mt-4 -ml-3 flex flex-wrap gap-2">
			<a class={button.quiet} href={appPath(locale, 'notice', { id: notice.id })}>
				<Icon name="pencil" class="size-4" />{t.edit}
			</a>
			<button class={button.danger} type="button" onclick={ondelete}>
				<Icon name="trash" class="size-4" />{t.delete}
			</button>
		</div>
	{/if}
</article>
