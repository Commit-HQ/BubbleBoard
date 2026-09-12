<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import BuildLabel from '$lib/components/BuildLabel.svelte';
	import LanguageSwitch from '$lib/components/LanguageSwitch.svelte';
	import { messages } from '$lib/i18n';
	import { appPath, homePath } from '$lib/paths';
	import type { LayoutProps } from './$types';

	let { children, data }: LayoutProps = $props();
	const t = $derived(messages[data.locale]);
</script>

<svelte:head>
	<!-- Search results should lead to the landing page, not to pages that need a card. -->
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="mx-auto flex min-h-dvh max-w-2xl flex-col px-4 sm:px-8">
	<header
		class="sticky top-3 z-10 my-3 flex items-center justify-between gap-4 rounded-full frosted py-1.5 pr-1.5 pl-3"
	>
		<a
			class="inline-flex items-center gap-2.5 text-xl font-bold tracking-tight"
			href={appPath(data.locale)}
		>
			<img src={favicon} alt="" width="36" height="36" />
			<!-- Enlarged text on a phone narrows the page below 20rem; then only the logo shows. -->
			<span class="max-[20rem]:sr-only">BubbleBoard</span>
		</a>
		<LanguageSwitch locale={data.locale} />
	</header>

	<main id="main" class="grid grow content-center py-8">
		{@render children()}
	</main>

	<footer class="flex flex-wrap justify-between gap-x-6 gap-y-2 py-6 text-sm text-muted">
		<a class="hover:text-ink" href={homePath(data.locale)}>{t.app.about}</a>
		<BuildLabel locale={data.locale} />
	</footer>
</div>
