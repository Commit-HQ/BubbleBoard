<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { byline, editedNote, errorMessage, listNames, messages, type Locale } from '$lib/i18n';
	import { namesOf } from '$lib/kindergarten';
	import type { Notice } from '$lib/notices';
	import { appPath } from '$lib/paths';
	import Attachments from './Attachments.svelte';
	import HideButton from './HideButton.svelte';
	import NoticeBody from './NoticeBody.svelte';
	import NoticePoll from './NoticePoll.svelte';
	import SeenMarks from './SeenMarks.svelte';
	import { spotlit } from './spotlight.svelte';
	import { getApp, Task } from './state.svelte';
	import { alert, button, paperClass } from './ui';

	// One notice on the board, on its paper, with its poll, pictures, and documents. A family marks it as seen,
	// and until then it stands out; staff see which of its families did, and the actions open to whoever may
	// change it, pinning it to the top of the board among them. A pinned notice hangs from a pushpin.
	let { locale, notice, ondelete }: { locale: Locale; notice: Notice; ondelete: () => void } =
		$props();
	const app = getApp();
	const t = $derived(messages[locale].app.notices);
	const pinning = new Task();
	/** Who put the notice up and when, and whether it was edited since, and by whom for staff. */
	const details = $derived(
		byline(
			locale,
			notice.author,
			notice.announcedAt,
			notice.editedAt ? editedNote(locale, app.editorOf(notice)) : undefined
		)
	);
	const unseen = $derived(app.status === 'family' && !app.isSeen(notice));
	const pinned = $derived(notice.pinnedAt !== null);
	/** On a staff device, the families the notice is for, whose poll answers it shows. */
	const families = $derived(app.audience(notice));
</script>

<article
	{@attach spotlit(notice.id)}
	class="relative rounded-3xl p-5 text-ink shadow-lg shadow-ink/5 sm:p-6 {unseen
		? 'ring-2 ring-accent'
		: 'ring-1 ring-ink/5'} {pinned ? 'mt-3' : ''} {paperClass[notice.paper]}"
>
	{#if pinned}
		<!-- The pushpin's head, holding the paper up at the top. -->
		<span
			class="absolute -top-3.5 left-1/2 size-7 -translate-x-1/2 rounded-full bg-rose-500 shadow-md ring-2 shadow-ink/30 ring-white/80"
			aria-hidden="true"
		>
			<span class="absolute top-1.5 left-1.5 size-2 rounded-full bg-white/70"></span>
		</span>
	{/if}
	<header class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm">
		<p class="font-semibold">
			{#if pinned}
				<span class="mr-2 inline-flex items-center gap-1 text-rose-700">
					<Icon name="pin" class="size-3.5 self-center" />{t.pinned}
				</span>
			{/if}
			{listNames(locale, namesOf(app.myClassrooms, notice.classrooms))}
		</p>
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
		<div class="mt-5">
			<Attachments
				{locale}
				files={notice.files}
				openPicture={(file) => app.noticePicture(notice, file)}
				saveDocument={(file) => app.saveNoticeFile(notice, file)}
			/>
		</div>
	{/if}

	<SeenMarks {locale} post={notice} onmark={() => app.markSeen(notice)} class="mt-4" />

	{#if app.status === 'staff'}
		<div class="mt-4 flex flex-wrap gap-2">
			{#if app.canChange(notice)}
				<a class="{button.quiet} -ml-3" href={appPath(locale, 'notice', { id: notice.id })}>
					<Icon name="pencil" class="size-4" />{t.edit}
				</a>
				<button
					class={button.quiet}
					type="button"
					disabled={pinning.busy}
					onclick={() => pinning.run(() => app.pinNotice(notice, !pinned))}
				>
					<Icon name="pin" class="size-4" />{pinned ? t.unpin : t.pin}
				</button>
				<button class={button.danger} type="button" onclick={ondelete}>
					<Icon name="trash" class="size-4" />{t.delete}
				</button>
			{/if}
			<HideButton {locale} post={notice} />
		</div>
		{#if pinning.error}
			<p class="{alert} mt-3" role="alert">{errorMessage(locale, pinning.error)}</p>
		{/if}
	{/if}
</article>
