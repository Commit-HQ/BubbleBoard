<script lang="ts">
	import { version } from '$app/environment';
	import favicon from '$lib/assets/favicon.svg';
	import AppLink from '$lib/components/AppLink.svelte';
	import Icon, { type IconName } from '$lib/components/Icon.svelte';
	import { localePath, locales, messages } from '$lib/i18n';
	import { contactEmail, organizationUrl, repositoryUrl } from '$lib/project';
	import '$lib/styles/app.css';
	import type { LayoutProps } from './$types';

	let { children, data }: LayoutProps = $props();
	const t = $derived(messages[data.locale]);
	const home = $derived(localePath(data.locale));
	const sections = $derived(
		Object.entries(t.nav.sections).map(([id, label]) => ({ href: `${home}#${id}`, label }))
	);
	const project: { href: string; label: string; icon: IconName }[] = $derived([
		{ href: repositoryUrl, label: t.footer.github, icon: 'github' },
		{ href: `${repositoryUrl}/blob/main/LICENSE`, label: t.footer.license, icon: 'file' },
		{
			href: `${repositoryUrl}/blob/main/src/lib/assets/photos/CREDITS.md`,
			label: t.footer.credits,
			icon: 'image'
		}
	]);
	// "Made with love by the people at [Commit]": the bracketed part is the link.
	const madeBy = $derived(t.footer.madeBy.split(/\[|\]/));
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<meta name="theme-color" content="#faf7ff" />
</svelte:head>

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
		<nav class="hidden xl:block" aria-label={t.nav.label}>
			<ul class="flex">
				{#each sections as { href, label } (href)}
					<li>
						<a
							class="block rounded-full px-3 py-3 text-sm font-semibold text-muted transition-colors hover:bg-ink/5 hover:text-ink"
							{href}>{label}</a
						>
					</li>
				{/each}
			</ul>
		</nav>
		<div class="flex items-center gap-2">
			<nav class="flex rounded-full bg-ink/5 p-0.5" aria-label={t.language}>
				{#each locales as locale (locale)}
					<a
						class="grid min-h-11 min-w-11 place-items-center rounded-full text-sm font-bold text-muted transition-colors aria-[current=page]:bg-ink aria-[current=page]:text-white"
						href={localePath(locale)}
						hreflang={locale}
						lang={locale}
						aria-label={messages[locale].languageName}
						aria-current={locale === data.locale ? 'page' : undefined}>{locale.toUpperCase()}</a
					>
				{/each}
			</nav>
			<AppLink labels={t.app} class="hidden px-5 py-3 text-sm sm:inline-flex" />
		</div>
	</header>

	<main id="main">
		{@render children()}
	</main>

	<!-- A brand column and three link columns of three rows each; section links fill two of them. -->
	<footer class="mb-4 rounded-4xl glass p-7 sm:p-10">
		<div class="grid gap-x-6 gap-y-8 md:grid-cols-3 md:gap-x-10 lg:grid-cols-[1.3fr_1fr_1fr_1fr]">
			<div class="md:col-span-3 lg:col-span-1">
				<p class="inline-flex items-center gap-2.5 text-xl font-bold tracking-tight">
					<img src={favicon} alt="" width="32" height="32" />BubbleBoard
				</p>
				<p class="mt-3 text-muted">{t.footer.tagline}</p>
				<a
					class="mt-2 inline-flex items-center gap-2 text-muted hover:text-ink"
					href="mailto:{contactEmail}"
				>
					<Icon name="mail" class="size-4" />{contactEmail}
				</a>
			</div>
			<div class="md:col-span-2">
				<h2 class="text-lg">{t.footer.explore}</h2>
				<ul
					class="mt-3 grid grid-flow-col grid-cols-2 grid-rows-3 gap-x-6 gap-y-2 text-muted md:gap-x-10"
				>
					{#each sections as { href, label } (href)}
						<li><a class="hover:text-ink" {href}>{label}</a></li>
					{/each}
				</ul>
			</div>
			<div>
				<h2 class="text-lg">{t.footer.project}</h2>
				<ul class="mt-3 grid gap-2 text-muted">
					{#each project as { href, label, icon } (href)}
						<li>
							<a class="inline-flex items-center gap-2 hover:text-ink" {href}>
								<Icon name={icon} class="size-4" />{label}
							</a>
						</li>
					{/each}
				</ul>
			</div>
		</div>
		<div
			class="mt-10 flex flex-wrap justify-between gap-x-6 gap-y-2 border-t border-ink/10 pt-6 text-sm text-muted"
		>
			<p class="flex items-center gap-1.5">
				<Icon name="heart" class="size-4 shrink-0 fill-blush text-blush" />
				<span
					>{madeBy[0]}<a class="font-semibold text-ink hover:underline" href={organizationUrl}
						>{madeBy[1]}</a
					>{madeBy[2]}</span
				>
			</p>
			<a class="hover:text-ink" href="{repositoryUrl}/commit/{version}">
				{t.footer.build}
				{version}
			</a>
		</div>
	</footer>
</div>
