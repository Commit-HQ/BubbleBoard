<script lang="ts">
	import { version } from '$app/environment';
	import favicon from '$lib/assets/favicon.svg';
	import { localePath, locales, messages } from '$lib/i18n';
	import { repositoryUrl } from '$lib/project';
	import '$lib/styles/app.css';
	import type { LayoutProps } from './$types';

	type Link = { href: string; label: string; lang?: string };

	let { children, data }: LayoutProps = $props();
	const t = $derived(messages[data.locale]);
	const home = $derived(localePath(data.locale));
	const sections = $derived(
		Object.entries(t.nav.sections).map(([id, label]) => ({ href: `${home}#${id}`, label }))
	);
	const project = $derived([
		{ href: repositoryUrl, label: t.footer.source },
		{ href: `${repositoryUrl}/blob/main/LICENSE`, label: t.footer.license },
		{ href: `${repositoryUrl}/blob/main/docs/architecture.md`, label: t.footer.architecture },
		{ href: `${repositoryUrl}/blob/main/src/lib/assets/photos/CREDITS.md`, label: t.footer.credits }
	]);
	const languages = locales.map((locale) => ({
		href: localePath(locale),
		label: messages[locale].languageName,
		lang: locale
	}));
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<meta name="theme-color" content="#faf7ff" />
</svelte:head>

{#snippet linkList(title: string, links: Link[])}
	<div>
		<h2 class="text-lg">{title}</h2>
		<ul class="mt-3 grid gap-2 text-muted">
			{#each links as { href, label, lang } (href)}
				<li><a class="hover:text-ink" {href} hreflang={lang} {lang}>{label}</a></li>
			{/each}
		</ul>
	</div>
{/snippet}

<a
	class="fixed top-4 left-4 z-20 -translate-y-24 rounded-full bg-ink px-4 py-3 text-white focus:translate-y-0"
	href="#main">{t.skip}</a
>

<div class="mx-auto max-w-7xl px-4 sm:px-8 lg:px-10">
	<header
		class="sticky top-3 z-10 my-3 flex items-center justify-between gap-4 rounded-full glass py-1.5 pr-1.5 pl-3"
	>
		<a
			class="inline-flex items-center gap-2.5 text-xl font-bold tracking-tight"
			href={home}
			aria-label={t.home}
		>
			<img src={favicon} alt="" width="36" height="36" />BubbleBoard
		</a>
		<nav class="hidden lg:block" aria-label={t.nav.label}>
			<ul class="flex">
				{#each sections as { href, label } (href)}
					<li>
						<a
							class="block rounded-full px-4 py-3 text-sm font-semibold text-muted transition-colors hover:bg-ink/5 hover:text-ink"
							{href}>{label}</a
						>
					</li>
				{/each}
			</ul>
		</nav>
		<nav class="flex rounded-full bg-ink/5 p-0.5" aria-label={t.language}>
			{#each languages as { href, label, lang } (href)}
				<a
					class="grid min-h-11 min-w-11 place-items-center rounded-full text-sm font-bold text-muted transition-colors aria-[current=page]:bg-ink aria-[current=page]:text-white"
					{href}
					hreflang={lang}
					{lang}
					aria-label={label}
					aria-current={lang === data.locale ? 'page' : undefined}>{lang.toUpperCase()}</a
				>
			{/each}
		</nav>
	</header>

	<main id="main">
		{@render children()}
	</main>

	<footer class="mb-4 rounded-4xl glass p-7 sm:p-10">
		<div class="grid grid-cols-2 gap-10 sm:grid-cols-3 lg:grid-cols-[2fr_1fr_1fr_1fr]">
			<div class="col-span-2 sm:col-span-3 lg:col-span-1">
				<p class="inline-flex items-center gap-2.5 text-xl font-bold tracking-tight">
					<img src={favicon} alt="" width="32" height="32" />BubbleBoard
				</p>
				<p class="mt-3 max-w-xs text-muted">{t.footer.tagline}</p>
			</div>
			{@render linkList(t.footer.product, sections)}
			{@render linkList(t.footer.project, project)}
			{@render linkList(t.language, languages)}
		</div>
		<div
			class="mt-10 flex flex-wrap justify-between gap-x-6 gap-y-2 border-t border-ink/10 pt-6 text-sm text-muted"
		>
			<p>BubbleBoard · {t.footer.status}</p>
			<a class="hover:text-ink" href="{repositoryUrl}/commit/{version}">
				{t.footer.build}
				{version}
			</a>
		</div>
	</footer>
</div>
