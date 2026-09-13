<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import shareImage from '$lib/assets/photos/share.jpg';
	import Bubble from '$lib/components/Bubble.svelte';
	import Icon, { type IconName } from '$lib/components/Icon.svelte';
	import IconTile from '$lib/components/IconTile.svelte';
	import Photo from '$lib/components/Photo.svelte';
	import { locales, messages } from '$lib/i18n';
	import { appPath, homePath } from '$lib/paths';
	import { absoluteUrl, contactEmail, repositoryUrl } from '$lib/project';
	import type { PageProps } from './$types';

	type Item = { title: string; copy: string };

	let { data }: PageProps = $props();
	const t = $derived(messages[data.locale]);
	const url = $derived(absoluteUrl(homePath(data.locale)));
	const writeToUs = $derived(
		`mailto:${contactEmail}?subject=${encodeURIComponent(t.kindergartens.subject)}`
	);
</script>

<svelte:head>
	<title>BubbleBoard · {t.title}</title>
	<meta name="description" content={t.description} />

	<!-- Link previews in messaging apps and social networks. -->
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="BubbleBoard" />
	<meta property="og:title" content="BubbleBoard · {t.title}" />
	<meta property="og:description" content={t.description} />
	<meta property="og:url" content={url} />
	<meta property="og:locale" content={t.ogLocale} />
	{#each locales.filter((locale) => locale !== data.locale) as locale (locale)}
		<meta property="og:locale:alternate" content={messages[locale].ogLocale} />
	{/each}
	<meta property="og:image" content={absoluteUrl(shareImage)} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:image:alt" content={t.hero.photoAlt} />
	<meta name="twitter:card" content="summary_large_image" />
</svelte:head>

<!-- A small tag after the title of what BubbleBoard can't do yet. -->
{#snippet soon()}
	<span
		class="ml-1.5 inline-block rounded-full bg-accent/10 px-2.5 py-0.5 align-middle font-sans text-xs font-bold tracking-normal whitespace-nowrap text-indigo-700"
		>{t.soon}</span
	>
{/snippet}

{#snippet intro(id: string, title: string, copy: string, upcoming = false)}
	<h2 id="{id}-title" class="mb-4 max-w-2xl text-4xl sm:text-5xl">
		{title}
		{#if upcoming}{@render soon()}{/if}
	</h2>
	<p class="max-w-md text-lg text-muted">{copy}</p>
{/snippet}

{#snippet action(href: string, label: string, icon: IconName)}
	<a
		class="inline-flex items-center gap-3 rounded-full bg-ink py-2 pr-2 pl-6 font-semibold text-white shadow-xl shadow-ink/30 hover:-translate-y-0.5 motion-safe:transition-transform"
		{href}
	>
		{label}
		<span class="grid size-9 shrink-0 place-items-center rounded-full bg-white text-ink">
			<Icon name={icon} class="size-4" />
		</span>
	</a>
{/snippet}

{#snippet feature(icon: IconName, item: Item, upcoming = false)}
	<li class="rounded-3xl glass p-6">
		<IconTile {icon} />
		<h3 class="mt-5 font-bold">
			{item.title}
			{#if upcoming}{@render soon()}{/if}
		</h3>
		<p class="mt-1 text-muted">{item.copy}</p>
	</li>
{/snippet}

{#snippet safeguard(icon: IconName, item: Item)}
	<li class="p-7 sm:p-8">
		<IconTile {icon} tone="ink" />
		<h3 class="mt-5 font-bold">{item.title}</h3>
		<p class="mt-1 text-muted">{item.copy}</p>
	</li>
{/snippet}

<div class="flex flex-col gap-20 pb-20 lg:gap-28 lg:pb-28">
	<section
		class="grid items-center gap-10 pt-8 lg:grid-cols-2 lg:gap-16 lg:pt-12"
		aria-labelledby="hero-title"
	>
		<div>
			<!-- Sized so each line stays on one row in both languages from 375px ("njihovom danu." is the longest). -->
			<h1 id="hero-title" class="mb-6 text-[2.75rem] leading-none sm:text-6xl xl:text-7xl">
				{t.hero.heading}
				<span class="block text-sunrise">{t.hero.headingAccent}</span>
			</h1>
			<p class="max-w-lg text-lg text-muted">{t.description}</p>
			<!-- Families open the app with their card; kindergartens without BubbleBoard find the contact section. -->
			<div class="mt-9 flex flex-wrap items-center gap-x-6 gap-y-4">
				{@render action(appPath(data.locale), t.hero.open, 'arrowRight')}
				<a
					class="flex items-center gap-2 font-semibold text-muted hover:text-ink"
					href="#kindergartens"
				>
					{t.hero.cta}<Icon name="arrowDown" class="size-4 shrink-0" />
				</a>
			</div>
			<p class="mt-5 text-sm text-muted">{t.hero.quiet}</p>
		</div>
		<div class="relative w-full lg:max-w-lg lg:justify-self-end">
			<div class="relative aspect-4/5 overflow-hidden rounded-4xl shadow-2xl shadow-indigo-950/25">
				<Photo
					name="bubbles"
					alt={t.hero.photoAlt}
					sizes="(min-width: 1024px) 32rem, calc(100vw - 2rem)"
					eager
				/>
				<!-- Lock-screen notifications are generic on purpose; the details are only in the app. -->
				<ul class="absolute inset-x-4 bottom-4 grid gap-2" aria-hidden="true">
					{#each t.hero.notifications as { time, message } (message)}
						<li class="flex items-center gap-3 rounded-2xl frosted p-3 pr-4 leading-snug">
							<img src={favicon} alt="" width="40" height="40" class="shrink-0" />
							<div class="min-w-0 grow text-sm sm:text-base">
								<p class="flex items-baseline justify-between gap-3">
									<strong class="font-semibold">BubbleBoard</strong>
									<small class="text-xs text-ink/70">{time}</small>
								</p>
								<p>{message}</p>
							</div>
						</li>
					{/each}
				</ul>
			</div>
			<!-- Same big, medium, small grouping as the logo, drifting off the photo. -->
			<Bubble class="top-12 -left-3 size-28 sm:-left-12 sm:size-36" />
			<Bubble class="-top-5 left-28 size-14 sm:left-32 sm:size-16" />
			<Bubble class="top-52 -left-2 size-8 sm:top-60 sm:-left-20 sm:size-10" />
		</div>
	</section>

	<section id="features" aria-labelledby="features-title">
		{@render intro('features', t.features.title, t.features.copy)}
		<ul class="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{@render feature('megaphone', t.features.notices)}
			{@render feature('image', t.features.photos, true)}
			{@render feature('message', t.features.messages, true)}
			{@render feature('file', t.features.documents)}
			{@render feature('bell', t.features.notifications)}
			{@render feature('phone', t.features.devices)}
		</ul>
	</section>

	<section id="how" class="grid gap-4 lg:grid-cols-2" aria-labelledby="how-title">
		<div class="aspect-square overflow-hidden rounded-4xl lg:aspect-auto lg:min-h-96">
			<Photo
				name="classroom"
				alt={t.how.photoAlt}
				sizes="(min-width: 1024px) 37rem, calc(100vw - 2rem)"
			/>
		</div>
		<div class="rounded-4xl glass p-7 sm:p-12">
			{@render intro('how', t.how.title, t.how.copy)}
			<ol class="mt-8">
				{#each t.how.steps as { title, copy }, i (title)}
					<li class="flex gap-5 border-t border-ink/10 py-4">
						<span class="w-6 font-display text-3xl leading-none text-accent">{i + 1}</span>
						<div>
							<h3 class="font-bold">{title}</h3>
							<p class="mt-1 text-muted">{copy}</p>
						</div>
					</li>
				{/each}
			</ol>
		</div>
	</section>

	<section
		id="privacy"
		class="grid items-center gap-8 rounded-4xl glass bg-linear-135 from-accent/15 via-blush/10 to-apricot/15 p-5 sm:p-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16 lg:py-5 lg:pr-5 lg:pl-16"
		aria-labelledby="privacy-title"
	>
		<div>
			{@render intro('privacy', t.privacy.title, t.privacy.copy, true)}
			<ul class="mt-8 grid gap-3.5">
				{#each t.privacy.facts as fact (fact)}
					<li class="flex gap-3 font-semibold">
						<Icon name="check" class="mt-0.5 size-5 shrink-0 text-accent" />{fact}
					</li>
				{/each}
			</ul>
		</div>
		<div class="aspect-4/5 overflow-hidden rounded-3xl">
			<Photo
				name="painting"
				alt={t.privacy.photoAlt}
				sizes="(min-width: 1024px) 30rem, calc(100vw - 4.5rem)"
			/>
		</div>
	</section>

	<section
		id="teachers"
		class="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16"
		aria-labelledby="teachers-title"
	>
		<div class="lg:pt-6">
			{@render intro('teachers', t.teachers.title, t.teachers.copy)}
		</div>
		<ul class="grid gap-4 sm:grid-cols-2">
			{@render feature('eye', t.teachers.preview, true)}
			{@render feature('trash', t.teachers.remove)}
			{@render feature('clock', t.teachers.retention)}
			{@render feature('key', t.teachers.access)}
		</ul>
	</section>

	<section id="security" aria-labelledby="security-title">
		{@render intro('security', t.security.title, t.security.copy)}
		<ul
			class="mt-10 grid divide-y divide-ink/10 rounded-4xl glass md:grid-cols-3 md:divide-x md:divide-y-0"
		>
			{@render safeguard('lock', t.security.device)}
			{@render safeguard('database', t.security.server)}
			{@render safeguard('eyeOff', t.security.host)}
		</ul>
		<p class="mt-5 text-sm text-muted">{t.security.note}</p>
	</section>

	<section
		id="kindergartens"
		class="relative isolate overflow-hidden rounded-4xl glass bg-linear-135 from-apricot/15 via-blush/10 to-accent/15 px-6 py-12 text-center sm:px-12 sm:py-16"
		aria-labelledby="kindergartens-title"
	>
		<!-- Behind the text but above the section's own background, which is what `isolate` is for. -->
		<Bubble class="-top-20 -right-20 -z-10 size-48 sm:-top-24 sm:-right-16 sm:size-80" />
		<h2 id="kindergartens-title" class="mx-auto mb-4 max-w-2xl text-4xl sm:text-5xl">
			{t.kindergartens.title}
		</h2>
		<p class="mx-auto max-w-2xl text-lg text-muted">{t.kindergartens.copy}</p>
		<ul class="mx-auto mt-8 grid w-fit gap-3.5">
			{#each t.kindergartens.facts as fact (fact)}
				<li class="flex gap-2 text-left font-semibold">
					<Icon name="check" class="mt-0.5 size-5 shrink-0 text-accent" />{fact}
				</li>
			{/each}
		</ul>
		<p class="mx-auto mt-6 max-w-xl text-muted">{t.kindergartens.hosting}</p>
		<div class="mt-9">
			{@render action(writeToUs, t.kindergartens.cta, 'mail')}
		</div>
		<p class="mx-auto mt-10 max-w-xl text-sm text-muted">
			{t.kindergartens.mission}
			{t.kindergartens.itTeam}
			<a class="font-semibold text-ink underline underline-offset-4" href={repositoryUrl}
				>{t.kindergartens.code}</a
			>
		</p>
	</section>
</div>
