<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import type { NoticeFile } from '$lib/files';
	import { fileSize, type Locale } from '$lib/i18n';
	import { field } from './ui';

	// A file on a notice, by its name and size, in a row that saves it or takes it off. A picture can show
	// small in front of it, once it's opened.
	let {
		locale,
		file,
		picture
	}: {
		locale: Locale;
		file: Pick<NoticeFile, 'name' | 'bytes'>;
		picture?: Promise<{ url: string }>;
	} = $props();
</script>

{#if picture}
	<span
		class="grid size-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-ink/5 text-muted ring-1 ring-ink/10"
	>
		{#await picture}
			<Icon name="image" class="size-5" />
		{:then { url }}
			<img src={url} alt="" class="size-full object-cover" />
		{:catch}
			<Icon name="alert" class="size-5" />
		{/await}
	</span>
{:else}
	<Icon name="file" class="size-5 shrink-0 text-muted" />
{/if}
<span class="min-w-0 flex-1 py-1.5">
	<!-- Two lines at most, broken anywhere, so a long name never widens its notice. -->
	<span class="line-clamp-2 font-semibold">{file.name}</span>
	<span class={field.hint}>{fileSize(locale, file.bytes)}</span>
</span>
