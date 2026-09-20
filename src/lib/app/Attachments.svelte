<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { errorCode } from '$lib/errors';
	import { isPicture, type NoticeFile } from '$lib/files';
	import { errorMessage, messages, type Locale } from '$lib/i18n';
	import FileLabel from './FileLabel.svelte';
	import PictureViewer from './PictureViewer.svelte';
	import { Task, type Picture } from './state.svelte';
	import { alert } from './ui';

	// The files a notice or an info page carries: pictures as small squares that open on the whole screen, as the
	// board's photo does, to zoom in or save one, and documents in rows that save them. Pictures are fetched once
	// they come near the screen, so a long board doesn't fetch pictures no one scrolls to.
	let {
		locale,
		files,
		compact = false,
		openPicture,
		saveDocument
	}: {
		locale: Locale;
		files: NoticeFile[];
		/** Fewer, larger pictures across, for the narrow width of a message's bubble. */
		compact?: boolean;
		/** One of the pictures, fetched and opened. */
		openPicture: (file: NoticeFile) => Promise<Picture>;
		/** Fetches and opens one of the documents, and saves it on this device. */
		saveDocument: (file: NoticeFile) => Promise<void>;
	} = $props();
	const t = $derived(messages[locale].app.files);
	const task = new Task();
	const pictureFiles = $derived(files.filter(isPicture));
	const documents = $derived(files.filter((file) => !isPicture(file)));
	let near = $state(false);
	const pictures = $derived(near ? pictureFiles.map((file) => openPicture(file)) : []);
	/** Why the first picture that didn't open didn't, said once under them. */
	const failure = $derived(Promise.all(pictures).then(() => undefined, errorCode));
	let viewing = $state.raw<{ file: NoticeFile; picture: Picture }>();

	function nearScreen(list: HTMLElement) {
		const observer = new IntersectionObserver(
			(entries) => {
				if (!entries.some(({ isIntersecting }) => isIntersecting)) return;
				near = true;
				observer.disconnect();
			},
			{ rootMargin: '50% 0px' }
		);
		observer.observe(list);
		return () => observer.disconnect();
	}
</script>

{#snippet waiting()}
	<span class="grid size-full place-items-center text-muted"><Icon name="image" /></span>
{/snippet}

<div class="grid gap-3">
	{#if pictureFiles.length}
		<ul
			class="grid gap-2 {compact ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-3 sm:grid-cols-4'}"
			aria-label={t.pictures}
			{@attach nearScreen}
		>
			{#each pictureFiles as file, index (file.id)}
				<li class="aspect-square overflow-hidden rounded-2xl bg-white/60 ring-1 ring-ink/10">
					{#await pictures[index]}
						{@render waiting()}
					{:then picture}
						{#if picture}
							<button
								class="block size-full cursor-zoom-in"
								type="button"
								aria-label={t.open(file.name)}
								onclick={() => (viewing = { file, picture })}
							>
								<img src={picture.url} alt="" class="size-full object-cover" />
							</button>
						{:else}
							{@render waiting()}
						{/if}
					{:catch}
						<span class="grid size-full place-items-center text-muted"><Icon name="alert" /></span>
					{/await}
				</li>
			{/each}
		</ul>
		{#await failure then code}
			{#if code}<p class={alert} role="alert">{errorMessage(locale, code)}</p>{/if}
		{/await}
	{/if}
	{#if documents.length}
		<ul class="grid gap-2" aria-label={t.title}>
			{#each documents as file (file.id)}
				<li>
					<button
						class="flex min-h-14 w-full items-center gap-3 rounded-2xl bg-white/60 px-4 py-0.5 text-left ring-1 ring-ink/10 transition hover:bg-white disabled:opacity-50"
						type="button"
						aria-label={t.save(file.name)}
						disabled={task.busy}
						onclick={() => task.run(() => saveDocument(file))}
					>
						<FileLabel {locale} {file} />
						<Icon name="arrowDown" class="size-4 shrink-0 text-muted" />
					</button>
				</li>
			{/each}
		</ul>
	{/if}
	{#if task.error}
		<p class={alert} role="alert">{errorMessage(locale, task.error)}</p>
	{/if}
</div>

{#if viewing}
	<PictureViewer
		{locale}
		label={t.open(viewing.file.name)}
		picture={viewing.picture}
		name={viewing.file.name}
		onclose={() => (viewing = undefined)}
	/>
{/if}
