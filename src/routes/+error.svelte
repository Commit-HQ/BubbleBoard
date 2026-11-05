<script lang="ts">
	import { page } from '$app/state';
	import { button } from '$lib/app/ui';
	import poppedBubble from '$lib/assets/bubble-popped.svg';
	import SiteHeader from '$lib/components/SiteHeader.svelte';
	import { messages } from '$lib/i18n';
	import { appPath, pathLocale } from '$lib/paths';

	// An address no page has, or an error no page handles: a popped bubble and a way back, in the language
	// of the address. The way back is the app, since an installation has no other home page, and an installed
	// app keeps it in its window.
	const locale = $derived(pathLocale(page.url.pathname));
	const m = $derived(messages[locale]);
	const missing = $derived(page.status === 404);
	const app = $derived(appPath(locale));
</script>

<svelte:head>
	<title>BubbleBoard</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="mx-auto flex min-h-dvh max-w-2xl flex-col px-4 sm:px-8">
	<SiteHeader href={app} />

	<main id="main" class="my-auto py-10">
		<section class="grid justify-items-center rounded-4xl glass px-6 py-10 text-center sm:p-12">
			<img src={poppedBubble} alt="" width="200" height="200" class="size-40 sm:size-48" />
			<h1 class="mt-4 text-4xl sm:text-5xl">
				{missing ? m.error.missingTitle : m.error.title}
			</h1>
			<p class="mt-3 max-w-md text-lg text-muted">
				{missing ? m.error.missingCopy : m.error.copy}
			</p>
			<a class="{button.primary} mt-8" href={app}>{m.error.app}</a>
		</section>
	</main>
</div>
