<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import BuildLabel from '$lib/components/BuildLabel.svelte';
	import Icon, { type IconName } from '$lib/components/Icon.svelte';
	import LanguageSwitch from '$lib/components/LanguageSwitch.svelte';
	import SiteHeader from '$lib/components/SiteHeader.svelte';
	import { messages } from '$lib/i18n';
	import { homePath, privacyPath } from '$lib/paths';
	import { contactEmail, organizationUrl, repositoryUrl } from '$lib/project';
	import type { LayoutProps } from './$types';

	let { children, data }: LayoutProps = $props();
	const t = $derived(messages[data.locale]);
	const home = $derived(homePath(data.locale));
	const sections = $derived(
		Object.entries(t.nav.sections).map(([id, label]) => ({ href: `${home}#${id}`, label }))
	);
	const project: { href: string; label: string; icon: IconName }[] = $derived([
		{ href: repositoryUrl, label: t.footer.github, icon: 'github' },
		{ href: `${repositoryUrl}/blob/main/LICENSE`, label: t.footer.license, icon: 'file' },
		// Photo, font, and icon licenses, served by every installation.
		{ href: '/third-party-notices.txt', label: t.footer.credits, icon: 'image' }
	]);
</script>

<a
	class="fixed top-4 left-4 z-20 -translate-y-24 rounded-full bg-ink px-4 py-3 text-white focus:translate-y-0"
	href="#main">{t.skip}</a
>

<!-- Decorative bubbles are clipped rather than scrolling the page sideways when enlarged text leaves no
room. `clip`, unlike `hidden`, keeps the header sticky. -->
<div class="mx-auto max-w-7xl overflow-x-clip px-4 sm:px-8 lg:px-10">
	<SiteHeader href={home} label={t.home}>
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
		<LanguageSwitch locale={data.locale} />
	</SiteHeader>

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
				<span>
					{t.footer.madeBy}
					<a class="font-semibold text-ink hover:underline" href={organizationUrl}>Commit</a>
				</span>
			</p>
			<div class="flex flex-wrap gap-x-6 gap-y-2">
				<a class="hover:text-ink" href={privacyPath(data.locale)}>{t.footer.privacy}</a>
				<BuildLabel locale={data.locale} />
			</div>
		</div>
	</footer>
</div>
