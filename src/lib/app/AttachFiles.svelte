<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import {
		fileAccept,
		maxNoticeFiles,
		prepareFile,
		type NewFile,
		type NoticeFile
	} from '$lib/files';
	import { errorMessage, messages, type Locale } from '$lib/i18n';
	import FileLabel from './FileLabel.svelte';
	import type { Task } from './state.svelte';
	import { onDestroy } from 'svelte';
	import { alert, button, field, filePicker } from './ui';

	// The files in the form of a notice or an info page: those it carries already, and files picked here, each made
	// ready and sealed as it's attached, as long as there's room for them. `task` attaches them, so the form can wait
	// for it before saving.
	let {
		locale,
		task,
		disabled = false,
		files = $bindable()
	}: {
		locale: Locale;
		task: Task;
		/** Whether the form is saving, while no more files are picked. */
		disabled?: boolean;
		files: (NoticeFile | NewFile)[];
	} = $props();

	const t = $derived(messages[locale].app.files);
	const id = $props.id();
	// A file made ready after the form has gone, such as when the messages page moves to another conversation,
	// belongs to nothing: it mustn't join the files of whatever comes next.
	let disposed = false;
	onDestroy(() => (disposed = true));

	/**
	 * Makes the files picked ready to attach, one at a time, as long as there's room for them. A file that can't
	 * be attached is left out and the rest still come; the first one left out says why.
	 */
	function attach(event: Event & { currentTarget: EventTarget & HTMLInputElement }) {
		const input = event.currentTarget;
		const picked = [...(input.files ?? [])];
		input.value = '';
		if (files.length + picked.length > maxNoticeFiles) {
			task.error = 'too-many-files';
			return;
		}
		task.run(async () => {
			let failure: unknown;
			for (const file of picked) {
				try {
					// Ready first, then added to the files as they are now, which a removal meanwhile may have changed.
					const ready = await prepareFile(file);
					if (disposed) return;
					files = [...files, ready];
				} catch (cause) {
					if (disposed) return;
					failure ??= cause;
				}
			}
			if (failure) throw failure;
		});
	}
</script>

<div class="grid gap-3" role="group" aria-labelledby="{id}-files">
	<span id="{id}-files" class={field.name}>{t.title}</span>
	{#if files.length}
		<ul class="grid gap-2">
			{#each files as file (file.id)}
				<li
					class="flex items-center gap-3 rounded-2xl border border-ink/10 bg-white/60 py-1 pr-1 pl-4"
				>
					<FileLabel {locale} {file} />
					<button
						class={button.icon}
						type="button"
						aria-label={t.remove(file.name)}
						onclick={() => (files = files.filter((other) => other.id !== file.id))}
					>
						<Icon name="x" />
					</button>
				</li>
			{/each}
		</ul>
	{/if}
	{#if files.length < maxNoticeFiles}
		<label class="{button.secondary} {filePicker} justify-self-start">
			<Icon name="plus" class="size-4" />{t.attach}
			<input
				class="sr-only"
				type="file"
				multiple
				accept={fileAccept}
				disabled={task.busy || disabled}
				onchange={attach}
			/>
		</label>
	{/if}
	{#if task.busy}
		<p class="text-sm font-semibold text-muted" role="status">{t.preparing}</p>
	{:else}
		<p class={field.hint}>{t.hint}</p>
	{/if}
	{#if task.error}
		<p class={alert} role="alert">{errorMessage(locale, task.error)}</p>
	{/if}
</div>
