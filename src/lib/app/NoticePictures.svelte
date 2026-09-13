<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { errorCode } from '$lib/errors';
	import type { NoticeFile } from '$lib/files';
	import { errorMessage, messages, type Locale } from '$lib/i18n';
	import type { Notice } from '$lib/notices';
	import PictureViewer from './PictureViewer.svelte';
	import { getApp, type Picture } from './state.svelte';
	import { alert } from './ui';

	// A notice's pictures, as small squares that open on the whole screen, as the board's photo does, to zoom in
	// or save one. They're fetched once the notice comes near the screen, so a long board doesn't fetch
	// pictures no one scrolls to.
	let { locale, notice, files }: { locale: Locale; notice: Notice; files: NoticeFile[] } = $props();
	const app = getApp();
	const t = $derived(messages[locale].app.files);
	let near = $state(false);
	const pictures = $derived(near ? files.map((file) => app.noticePicture(notice, file)) : []);
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

<ul class="grid grid-cols-3 gap-2 sm:grid-cols-4" aria-label={t.pictures} {@attach nearScreen}>
	{#each files as file, index (file.id)}
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

{#if viewing}
	<PictureViewer
		{locale}
		label={t.open(viewing.file.name)}
		picture={viewing.picture}
		name={viewing.file.name}
		onclose={() => (viewing = undefined)}
	/>
{/if}
