<script lang="ts">
	import type { NewFile, NoticeFile } from '$lib/files';
	import { errorMessage, messages, type Locale } from '$lib/i18n';
	import AttachFiles from './AttachFiles.svelte';
	import NoticeEditor from './NoticeEditor.svelte';
	import { getApp, Task } from './state.svelte';
	import { alert, button, field, surface } from './ui';

	// The kindergarten's info page, to write or change: text on plain paper, and files, for everyone who uses the app.
	// It has no days or classrooms, because every classroom sees it until it's changed, and saving it notifies no one.
	// Clearing its text and files leaves it empty again.
	let { locale, onsaved }: { locale: Locale; onsaved: () => void } = $props();

	const app = getApp();
	const t = $derived(messages[locale].app);
	const id = $props.id();
	const task = new Task();
	const fileTask = new Task();
	/** The page as it is when the form opens: the edit page shows the form once this device has loaded it. */
	const start = app.info;
	/** The files the page carries already, and those made ready to attach. */
	let files = $state.raw<(NoticeFile | NewFile)[]>(start?.files ?? []);
	let editor = $state<ReturnType<typeof NoticeEditor>>();
	let ready = $state(false);

	function submit(event: SubmitEvent) {
		event.preventDefault();
		const body = editor?.getDocument();
		if (!body) {
			task.error = 'info-too-long';
			return;
		}
		task.run(async () => {
			await app.saveInfo({ body, files });
			onsaved();
		});
	}
</script>

<form class="{surface} grid gap-7" onsubmit={submit}>
	<div class="grid gap-1.5">
		<span id="{id}-text" class={field.name}>{t.info.text}</span>
		<NoticeEditor
			bind:this={editor}
			bind:ready
			{locale}
			content={start?.body}
			labelledby="{id}-text"
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
		{task.busy ? t.actions.working : t.actions.save}
	</button>
</form>
