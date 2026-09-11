<script lang="ts">
	import Icon, { type IconName } from '$lib/components/Icon.svelte';
	import Photo from '$lib/components/Photo.svelte';
	import { messages } from '$lib/i18n';
	import { repositoryUrl } from '$lib/project';
	import type { PageProps } from './$types';

	type Item = { title: string; copy: string };

	let { data }: PageProps = $props();
	const t = $derived(messages[data.locale]);
</script>

<svelte:head>
	<title>BubbleBoard · {t.title}</title>
	<meta name="description" content={t.description} />
</svelte:head>

{#snippet intro(id: string, title: string, copy: string)}
	<h2 id="{id}-title" class="mb-4 max-w-2xl text-4xl sm:text-5xl">{title}</h2>
	<p class="max-w-md text-lg text-muted">{copy}</p>
{/snippet}

{#snippet cta(href: string, label: string, icon: IconName)}
	<a
		class="mt-9 inline-flex items-center gap-3 rounded-full bg-ink py-2 pr-2 pl-6 font-semibold text-white shadow-xl shadow-ink/30 hover:-translate-y-0.5 motion-safe:transition-transform"
		{href}
	>
		{label}
		<span class="grid size-9 place-items-center rounded-full bg-white text-ink">
			<Icon name={icon} class="size-4" />
		</span>
	</a>
{/snippet}

{#snippet feature(icon: IconName, item: Item)}
	<li class="rounded-3xl glass p-6">
		<span class="grid size-11 place-items-center rounded-2xl bg-sunrise text-white">
			<Icon name={icon} />
		</span>
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
			<h1 id="hero-title" class="mb-6 text-5xl leading-none sm:text-6xl xl:text-8xl">
				{t.hero.heading}
				<span class="block text-sunrise">{t.hero.headingAccent}</span>
			</h1>
			<p class="max-w-md text-lg text-muted">{t.hero.lead}</p>
			{@render cta('#how', t.hero.cta, 'arrowDown')}
			<p class="mt-4 text-sm text-muted">{t.hero.quiet}</p>
		</div>
		<div
			class="relative aspect-4/5 w-full overflow-hidden rounded-4xl shadow-2xl shadow-indigo-950/25 lg:max-w-lg lg:justify-self-end"
		>
			<Photo name="bubbles" alt={t.hero.photoAlt} eager />
			<div
				class="absolute inset-x-4 bottom-4 flex items-center gap-3 rounded-2xl glass p-3 pr-4 leading-snug"
				aria-hidden="true"
			>
				<span
					class="grid size-10 shrink-0 place-items-center rounded-full bg-sunrise font-bold text-white"
					>A</span
				>
				<p class="text-sm sm:text-base">
					<strong class="font-semibold">{t.hero.mockTeacher}</strong>
					<small class="ml-1 text-xs text-muted">{t.hero.mockTime}</small><br />{t.hero.mockMessage}
				</p>
			</div>
		</div>
	</section>

	<section id="features" aria-labelledby="features-title">
		{@render intro('features', t.features.title, t.features.copy)}
		<ul class="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{@render feature('megaphone', t.features.notices)}
			{@render feature('image', t.features.photos)}
			{@render feature('message', t.features.messages)}
			{@render feature('file', t.features.documents)}
			{@render feature('bell', t.features.notifications)}
			{@render feature('phone', t.features.devices)}
		</ul>
	</section>

	<section id="how" class="grid gap-4 lg:grid-cols-2" aria-labelledby="how-title">
		<div class="aspect-square overflow-hidden rounded-4xl lg:aspect-auto lg:min-h-96">
			<Photo name="classroom" alt={t.how.photoAlt} />
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
			{@render intro('privacy', t.privacy.title, t.privacy.copy)}
			<ul class="mt-8 grid gap-3.5">
				{#each t.privacy.facts as fact (fact)}
					<li class="flex gap-3 font-semibold">
						<Icon name="check" class="mt-0.5 size-5 shrink-0 text-accent" />{fact}
					</li>
				{/each}
			</ul>
		</div>
		<div class="aspect-4/5 overflow-hidden rounded-3xl">
			<Photo name="painting" alt={t.privacy.photoAlt} />
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
			{@render feature('eye', t.teachers.preview)}
			{@render feature('trash', t.teachers.remove)}
			{@render feature('clock', t.teachers.retention)}
			{@render feature('key', t.teachers.access)}
		</ul>
	</section>

	<section
		class="grid items-center gap-8 rounded-4xl glass p-7 sm:p-12 lg:grid-cols-[1.2fr_0.8fr] lg:gap-16"
		aria-labelledby="open-title"
	>
		<div>
			{@render intro('open', t.open.title, t.open.copy)}
			{@render cta(repositoryUrl, t.open.cta, 'arrowRight')}
		</div>
		<aside class="rounded-3xl bg-white/60 p-6 text-muted">
			<h3 class="font-bold text-ink">{t.open.noticeTitle}</h3>
			<p class="mt-1">{t.open.noticeCopy}</p>
		</aside>
	</section>
</div>
