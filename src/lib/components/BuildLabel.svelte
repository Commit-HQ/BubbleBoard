<script lang="ts" module>
	// The version and commit, which Vite puts in at build time (vite.config.ts).
	declare const __VERSION__: string;
	declare const __COMMIT__: string;
</script>

<script lang="ts">
	import { messages, type Locale } from '$lib/i18n';
	import { repositoryUrl } from '$lib/project';

	// The version a build came from (product-spec.md §47).
	let { locale }: { locale: Locale } = $props();
	const t = $derived(messages[locale].build);
	// Empty for a release, else "abc1234", "abc1234-dirty" when built with uncommitted changes, or
	// "unknown" without Git metadata (vite.config.ts). A release, or a build that can't say, links to the
	// changelog as it was at its version's tag; any other build, to its commit.
	const [, commit, modified] = __COMMIT__.match(/^([0-9a-f]+)(-dirty)?$/) ?? [];
	const href = commit
		? `${repositoryUrl}/commit/${commit}`
		: `${repositoryUrl}/blob/v${__VERSION__}/CHANGELOG.md`;
</script>

<!-- In a window of its own, so the installed app keeps its place. -->
<a class="hover:text-ink" {href} target="_blank" rel="noopener noreferrer">
	{t.label}
	{__VERSION__}{#if commit}&nbsp;· {commit}{/if}
	{#if modified}({t.modified}){/if}
</a>
