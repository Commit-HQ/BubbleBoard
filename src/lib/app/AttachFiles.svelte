<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import {
		fileAccept,
		isPicture,
		maxNoticeFiles,
		openFile,
		openPicture as openSealedPicture,
		prepareFile,
		saveFile,
		withoutExtension,
		type NewFile,
		type NoticeFile
	} from '$lib/files';
	import { errorMessage, messages, type Locale } from '$lib/i18n';
	import FileLabel from './FileLabel.svelte';
	import PictureViewer from './PictureViewer.svelte';
	import { Task, type Picture } from './state.svelte';
	import { onDestroy } from 'svelte';
	import { alert, button, field, filePicker } from './ui';

	// The files in the form of a notice or an info page: those it carries already, and files picked here, each made
	// ready and sealed as it's attached, as long as there's room for them. `task` attaches them, so the form can wait
	// for it before saving. A file's row opens it, as on the notice: a picture on the whole screen and a document
	// saved, so whoever attached it can check it's the right one. One just picked opens from its sealed bytes here.
	let {
		locale,
		task,
		disabled = false,
		files = $bindable(),
		openPicture,
		saveDocument
	}: {
		locale: Locale;
		task: Task;
		/** Whether the form is saving, while no more files are picked. */
		disabled?: boolean;
		files: (NoticeFile | NewFile)[];
		/** One of the pictures the form carries already, fetched and opened. */
		openPicture?: (file: NoticeFile) => Promise<Picture>;
		/** Fetches and opens one of the documents the form carries already, and saves it on this device. */
		saveDocument?: (file: NoticeFile) => Promise<void>;
	} = $props();

	const t = $derived(messages[locale].app.files);
	const id = $props.id();
	// A file made ready after the form has gone, such as when the messages page moves to another conversation,
	// belongs to nothing: it mustn't join the files of whatever comes next.
	let disposed = false;
	onDestroy(() => {
		disposed = true;
		for (const id of pictures.keys()) forget(id);
	});
	const opening = new Task();
	let viewing = $state.raw<{ file: NoticeFile; picture: Picture }>();

	/**
	 * Each picture, opened once and kept while it's in the form, shown small in its row and on the whole screen
	 * when tapped. One just picked opens from its sealed bytes, under an address of its own that goes with it.
	 */
	const pictures = new Map<string, { picture: Promise<Picture>; own: boolean }>();

	function pictureOf(file: NoticeFile | NewFile) {
		if (!isPicture(file)) return;
		let kept = pictures.get(file.id);
		if (!kept) {
			const picture =
				'sealed' in file
					? openSealedPicture(file.sealed, file).then((blob) => ({
							blob,
							url: URL.createObjectURL(blob)
						}))
					: openPicture?.(file);
			if (!picture) return;
			kept = { picture, own: 'sealed' in file };
			pictures.set(file.id, kept);
		}
		return kept.picture;
	}

	function forget(id: string) {
		const kept = pictures.get(id);
		pictures.delete(id);
		if (kept?.own)
			kept.picture.then(
				({ url }) => URL.revokeObjectURL(url),
				() => {}
			);
	}

	// A file taken off, or sent with a message, takes its picture with it.
	$effect(() => {
		const ids = new Set(files.map((file) => file.id));
		for (const id of pictures.keys()) if (!ids.has(id)) forget(id);
	});

	const opens = (file: NoticeFile | NewFile) =>
		'sealed' in file || (isPicture(file) ? openPicture : saveDocument) !== undefined;

	function open(file: NoticeFile | NewFile) {
		const picture = pictureOf(file);
		opening.run(async () => {
			if (picture) viewing = { file, picture: await picture };
			else if ('sealed' in file) saveFile(await openFile(file.sealed, file), file.name);
			else await saveDocument?.(file);
		});
	}

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
					class="flex min-h-14 items-center gap-1 rounded-2xl border border-ink/10 bg-white/60 pr-1"
				>
					{#if opens(file)}
						<button
							class="flex min-w-0 flex-1 items-center gap-3 self-stretch rounded-l-2xl text-left transition hover:bg-white disabled:opacity-50 {isPicture(
								file
							)
								? 'py-1.5 pl-1.5'
								: 'py-1 pl-4'}"
							type="button"
							aria-label={isPicture(file) ? t.open(file.name) : t.save(file.name)}
							disabled={opening.busy}
							onclick={() => open(file)}
						>
							<FileLabel {locale} {file} picture={pictureOf(file)} />
						</button>
					{:else}
						<span class="flex min-w-0 flex-1 items-center gap-3 py-1 pl-4">
							<FileLabel {locale} {file} />
						</span>
					{/if}
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
	{#if opening.error}
		<p class={alert} role="alert">{errorMessage(locale, opening.error)}</p>
	{/if}
</div>

{#if viewing}
	<PictureViewer
		{locale}
		label={t.open(viewing.file.name)}
		picture={viewing.picture}
		name={withoutExtension(viewing.file.name)}
		onclose={() => (viewing = undefined)}
	/>
{/if}
