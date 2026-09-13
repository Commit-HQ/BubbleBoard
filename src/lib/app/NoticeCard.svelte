<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { isPicture } from '$lib/files';
	import { errorMessage, formatDateTime, listNames, messages, type Locale } from '$lib/i18n';
	import { namesOf } from '$lib/kindergarten';
	import type { Notice } from '$lib/notices';
	import { appPath } from '$lib/paths';
	import FileLabel from './FileLabel.svelte';
	import NoticeBody from './NoticeBody.svelte';
	import NoticePictures from './NoticePictures.svelte';
	import NoticePoll from './NoticePoll.svelte';
	import { getApp, Task } from './state.svelte';
	import { alert, button, paperClass } from './ui';

	// One notice on the board, on its paper, with its poll, pictures, and documents. A family marks it as seen,
	// and until then it stands out; staff see which of its families did, and the actions its author or an admin
	// may take.
	let { locale, notice, ondelete }: { locale: Locale; notice: Notice; ondelete: () => void } =
		$props();
	const app = getApp();
	const t = $derived(messages[locale].app.notices);
	const fileCopy = $derived(messages[locale].app.files);
	const pictures = $derived(notice.files?.filter(isPicture) ?? []);
	const documents = $derived(notice.files?.filter((file) => !isPicture(file)) ?? []);
	const task = new Task();
	const fileTask = new Task();
	/** Who put the notice up and when, and whether it was edited since. */
	const details = $derived(
		[
			notice.author,
			formatDateTime(locale, notice.announcedAt),
			notice.editedAt ? t.edited : undefined
		]
			.filter(Boolean)
			.join(' · ')
	);
	const unseen = $derived(app.status === 'family' && !app.isSeen(notice));
	/** On a staff device, the families the notice is for, and those of them that marked it as seen. */
	const families = $derived(app.audience(notice));
	const marked = $derived(new Set(notice.seen));
	const seen = $derived(families.filter(({ id }) => marked.has(id)));
	const notSeen = $derived(families.filter(({ id }) => !marked.has(id)));
</script>

<article
	class="rounded-3xl p-5 text-ink shadow-lg shadow-ink/5 sm:p-6 {unseen
		? 'ring-2 ring-accent'
		: 'ring-1 ring-ink/5'} {paperClass[notice.paper]}"
>
	<header class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm">
		<p class="font-semibold">{listNames(locale, namesOf(app.myClassrooms, notice.classrooms))}</p>
		<p class="text-muted">{details}</p>
	</header>
	<div class="mt-3">
		<NoticeBody blocks={notice.body.content} />
	</div>
	{#if notice.poll}
		<div class="mt-5">
			<NoticePoll {locale} {notice} poll={notice.poll} {families} />
		</div>
	{/if}

	{#if notice.files?.length}
		<div class="mt-5 grid gap-3">
			{#if pictures.length}<NoticePictures {locale} {notice} files={pictures} />{/if}
			{#if documents.length}
				<ul class="grid gap-2" aria-label={fileCopy.title}>
					{#each documents as file (file.id)}
						<li>
							<button
								class="flex min-h-14 w-full items-center gap-3 rounded-2xl bg-white/60 px-4 py-0.5 text-left ring-1 ring-ink/10 transition hover:bg-white disabled:opacity-50"
								type="button"
								aria-label={fileCopy.save(file.name)}
								disabled={fileTask.busy}
								onclick={() => fileTask.run(() => app.saveNoticeFile(notice, file))}
							>
								<FileLabel {locale} {file} />
								<Icon name="arrowDown" class="size-4 shrink-0 text-muted" />
							</button>
						</li>
					{/each}
				</ul>
			{/if}
			{#if fileTask.error}
				<p class={alert} role="alert">{errorMessage(locale, fileTask.error)}</p>
			{/if}
		</div>
	{/if}

	{#if app.status === 'family'}
		<div class="mt-4">
			{#if unseen}
				<button
					class={button.primary}
					type="button"
					disabled={task.busy}
					onclick={() => task.run(() => app.markSeen(notice))}
				>
					<Icon name="check" class="size-4" />{t.markSeen}
				</button>
			{:else}
				<p class="flex min-h-11 items-center gap-2 font-semibold text-muted">
					<Icon name="check" class="size-4" />{t.seen}
				</p>
			{/if}
			{#if task.error}
				<p class="{alert} mt-3" role="alert">{errorMessage(locale, task.error)}</p>
			{/if}
		</div>
	{:else if families.length}
		<details class="group mt-4 border-t border-ink/10 pt-2">
			<summary
				class="-ml-3 inline-flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-full px-3 text-sm font-semibold text-muted transition hover:bg-ink/5 hover:text-ink [&::-webkit-details-marker]:hidden"
			>
				<Icon name="eye" class="size-4" />{t.seenBy(seen.length, families.length)}
				<Icon
					name="chevronRight"
					class="size-4 transition-transform group-open:rotate-90 motion-reduce:transition-none"
				/>
			</summary>
			<div class="grid gap-1 text-sm">
				{#if notSeen.length}<p>{t.notSeenNames(notSeen.map(({ name }) => name))}</p>{/if}
				{#if seen.length}<p class="text-muted">{t.seenNames(seen.map(({ name }) => name))}</p>{/if}
			</div>
		</details>
	{/if}

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
