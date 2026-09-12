<script lang="ts">
	import { version } from '$app/environment';
	import { messages, type Locale } from '$lib/i18n';
	import { repositoryUrl } from '$lib/project';

	// The commit a build came from (product-spec.md §47).
	let { locale }: { locale: Locale } = $props();
	const t = $derived(messages[locale].build);
	// "abc1234", "abc1234-dirty" when built with uncommitted changes, or "unknown" (vite.config.ts).
	const [, commit, modified] = version.match(/^([0-9a-f]+)(-dirty)?$/) ?? [];
</script>

{#if commit}
	<a class="hover:text-ink" href="{repositoryUrl}/commit/{commit}">
		{t.label}
		{commit}
		{#if modified}({t.modified}){/if}
	</a>
{:else}
	<p>{t.unknown}</p>
{/if}
