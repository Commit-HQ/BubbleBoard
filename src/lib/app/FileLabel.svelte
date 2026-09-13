<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import type { NoticeFile } from '$lib/files';
	import { fileSize, type Locale } from '$lib/i18n';
	import { field } from './ui';

	// A file on a notice, by its name and size, in a row that saves it or takes it off.
	let { locale, file }: { locale: Locale; file: Pick<NoticeFile, 'name' | 'bytes'> } = $props();
</script>

<Icon name="file" class="size-5 shrink-0 text-muted" />
<span class="min-w-0 flex-1 py-1.5">
	<!-- Two lines at most, broken anywhere, so a long name never widens its notice. -->
	<span class="line-clamp-2 font-semibold">{file.name}</span>
	<span class={field.hint}>{fileSize(locale, file.bytes)}</span>
</span>
