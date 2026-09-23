<script lang="ts">
	import { createId } from '$lib/crypto';
	import type { NewFile, NoticeFile } from '$lib/files';
	import { errorMessage, messages, type Locale } from '$lib/i18n';
	import type { InfoPage } from '$lib/info';
	import type { Paper } from '$lib/notices';
	import { untrack } from 'svelte';
	import AttachFiles from './AttachFiles.svelte';
	import LeaveGuard from './LeaveGuard.svelte';
	import NoticeEditor from './NoticeEditor.svelte';
	import { getApp, Task } from './state.svelte';
	import { alert, button, field, surface } from './ui';

	// One of the kindergarten's info pages, to add or change: text on its paper, and files, for everyone who uses the
	// app. It has no days or classrooms, because every classroom sees it until it's changed or deleted, and saving it
	// notifies no one. The editor's toolbar chooses the paper, which it shows the text on.
	let { locale, page, onsaved }: { locale: Locale; page?: InfoPage; onsaved: () => void } =
		$props();

	const app = getApp();
	const t = $derived(messages[locale].app);
	const id = $props.id();
	const task = new Task();
	const fileTask = new Task();

	/**
	 * What the form starts with: the page as it is, or a new page on white. The edit page mounts a new form for each
	 * page, and reading the page in here, once, tells Svelte that's intended.
	 */
	function starting() {
		// The ID the page is added under, the same however often saving is tried.
		return { paper: page?.paper ?? 'white', files: page?.files ?? [], id: page?.id ?? createId() };
	}
	const start = starting();
	let paper = $state<Paper>(start.paper);
	/** The files the page carries already, and those made ready to attach. */
	let files = $state.raw<(NoticeFile | NewFile)[]>(start.files);
	let editor = $state<ReturnType<typeof NoticeEditor>>();
	let ready = $state(false);
	/** What the form held once the editor opened, to tell whether leaving loses anything. */
	let opened: string | undefined;
	let guard = $state<ReturnType<typeof LeaveGuard>>();

	/** Everything the form holds, as one string to compare. */
	function held() {
		const body = editor?.getDocument() ?? null;
		return JSON.stringify([body, paper, files.map((file) => file.id)]);
	}

	$effect(() => {
		if (ready) opened ??= untrack(held);
	});

	function submit(event: SubmitEvent) {
		event.preventDefault();
		const body = editor?.getDocument();
		if (!editor || editor.isEmpty()) task.error = 'empty-page';
		else if (!body) task.error = 'info-too-long';
		else {
			task.run(async () => {
				await app.saveInfoPage(start.id, { paper, body, files }, page);
				guard?.release();
				onsaved();
			});
		}
	}
</script>

<form class="{surface} grid gap-7" onsubmit={submit}>
	<div class="grid gap-1.5">
		<span id="{id}-text" class={field.name}>{t.info.text}</span>
		<NoticeEditor
			bind:this={editor}
			bind:ready
			{locale}
			content={page?.body}
			labelledby="{id}-text"
			bind:paper
		/>
		<p class={field.hint}>{t.info.hint}</p>
	</div>

	<AttachFiles {locale} task={fileTask} disabled={task.busy} bind:files />

	{#if task.error}<p class={alert} role="alert">{errorMessage(locale, task.error)}</p>{/if}
	<button
		class="{button.primary} justify-self-start"
		type="submit"
		disabled={task.busy || fileTask.busy || !ready}
	>
		{task.busy ? t.actions.working : page ? t.info.save : t.info.add}
	</button>
</form>

<!-- While saving, the page stays until the info page is saved; it would be lost with it otherwise. -->
<LeaveGuard
	bind:this={guard}
	{locale}
	{...t.leaveForm}
	ask={() => opened !== undefined && held() !== opened}
	hold={() => task.busy}
/>
