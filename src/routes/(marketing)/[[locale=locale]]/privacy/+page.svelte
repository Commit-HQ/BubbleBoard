<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { defaultLocale, locales, messages } from '$lib/i18n';
	import { privacyPath } from '$lib/paths';
	import { absoluteUrl, contactEmail } from '$lib/project';
	import type { PageProps } from './$types';

	// A few short points on what an installation stores, where, and for how long (privacyPolicy in en.ts).
	let { data }: PageProps = $props();
	const t = $derived(messages[data.locale].privacyPolicy);
</script>

<svelte:head>
	<title>BubbleBoard · {t.title}</title>
	<meta name="description" content={t.description} />
	<link rel="canonical" href={absoluteUrl(privacyPath(data.locale))} />
	{#each locales as locale (locale)}
		<link rel="alternate" hreflang={locale} href={absoluteUrl(privacyPath(locale))} />
	{/each}
	<link rel="alternate" hreflang="x-default" href={absoluteUrl(privacyPath(defaultLocale))} />
</svelte:head>

<article class="mx-auto max-w-3xl pt-8 pb-20 lg:pt-12 lg:pb-28">
	<h1 class="text-5xl sm:text-6xl">{t.title}</h1>
	<p class="mt-4 text-muted">{t.updated}</p>

	<div class="mt-10 rounded-4xl glass p-7 sm:p-12">
		<ul class="grid gap-6">
			{#each t.points as { title, copy } (title)}
				<li>
					<h2 class="text-xl">{title}</h2>
					<p class="mt-1">{copy}</p>
				</li>
			{/each}
		</ul>
		<a
			class="mt-8 inline-flex items-center gap-2 font-semibold underline underline-offset-4"
			href="mailto:{contactEmail}"
		>
			<Icon name="mail" class="size-4 shrink-0" />{contactEmail}
		</a>
	</div>
</article>
