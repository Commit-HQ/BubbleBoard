<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import Photo from '$lib/components/Photo.svelte';
	import { messages } from '$lib/i18n';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
	const t = $derived(messages[data.locale]);
	const languages = [
		['hr', 'Hrvatski'],
		['en', 'English']
	] as const;
	const steps = $derived([
		[t.scanTitle, t.scanCopy],
		[t.pushTitle, t.pushCopy],
		[t.shareTitle, t.shareCopy]
	]);
	const facts = $derived([t.factPasswords, t.factFaces, t.factFade, t.factHost]);
</script>

<svelte:head>
	<title>BubbleBoard · {t.title}</title>
	<meta name="description" content={t.description} />
</svelte:head>

<div class="mx-auto max-w-7xl px-4 sm:px-8 lg:px-10">
	<header
		class="sticky top-3 z-10 my-3 flex items-center justify-between gap-4 rounded-full glass py-1.5 pr-1.5 pl-3"
	>
		<a
			class="inline-flex items-center gap-2.5 text-xl font-bold tracking-tight"
			href="/"
			aria-label={t.home}
		>
			<img src={favicon} alt="" width="36" height="36" />BubbleBoard
		</a>
		<div class="flex items-center gap-3">
			<span class="hidden text-sm font-semibold text-muted sm:inline">{t.preview}</span>
			<form
				class="flex rounded-full bg-ink/5 p-0.5"
				method="POST"
				action="/language"
				aria-label={t.language}
			>
				{#each languages as [locale, label] (locale)}
					<button
						class="min-h-11 min-w-11 cursor-pointer rounded-full text-sm font-bold text-muted transition-colors aria-pressed:bg-ink aria-pressed:text-white"
						name="locale"
						value={locale}
						lang={locale}
						aria-label={label}
						aria-pressed={data.locale === locale}>{locale.toUpperCase()}</button
					>
				{/each}
			</form>
		</div>
	</header>

	<main id="main">
		<section
			class="grid items-center gap-10 pt-8 pb-14 lg:grid-cols-2 lg:gap-16 lg:pt-12 lg:pb-20"
			aria-labelledby="hero-title"
		>
			<div>
				<h1 id="hero-title" class="mb-6 text-5xl leading-none sm:text-6xl xl:text-8xl">
					{t.heading}
					<span class="block bg-sunrise bg-clip-text pb-[0.08em] text-transparent"
						>{t.headingAccent}</span
					>
				</h1>
				<p class="max-w-md text-lg text-muted">{t.lead}</p>
				<a
					class="mt-9 inline-flex items-center gap-3 rounded-full bg-ink py-2 pr-2 pl-6 font-semibold text-white shadow-xl shadow-ink/30 hover:-translate-y-0.5 motion-safe:transition-transform"
					href="#how"
				>
					{t.cta}
					<span class="grid size-9 place-items-center rounded-full bg-white text-ink">
						<svg
							class="size-4"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2.4"
							stroke-linecap="round"
							stroke-linejoin="round"><path d="M12 5v14M5 12l7 7 7-7" /></svg
						>
					</span>
				</a>
				<p class="mt-4 text-sm text-muted">{t.quiet}</p>
			</div>
			<div
				class="relative aspect-4/5 w-full overflow-hidden rounded-4xl shadow-2xl shadow-indigo-950/25 lg:max-w-lg lg:justify-self-end"
			>
				<Photo
					name="bubbles"
					alt={t.heroAlt}
					sizes="(min-width: 1024px) 512px, calc(100vw - 2rem)"
					eager
				/>
				<div
					class="absolute inset-x-4 bottom-4 flex items-center gap-3 rounded-2xl glass p-3 pr-4 leading-snug"
					aria-hidden="true"
				>
					<span
						class="grid size-10 shrink-0 place-items-center rounded-full bg-sunrise font-bold text-white"
						>A</span
					>
					<p class="text-sm sm:text-base">
						<strong class="font-semibold">{t.mockTeacher}</strong>
						<small class="ml-1 text-xs text-muted">{t.mockTime}</small><br />{t.mockMessage}
					</p>
				</div>
			</div>
		</section>

		<section id="how" class="grid gap-4 pt-8 pb-20 lg:grid-cols-2" aria-labelledby="how-title">
			<div class="aspect-square overflow-hidden rounded-4xl lg:aspect-auto lg:min-h-96">
				<Photo
					name="classroom"
					alt={t.classroomAlt}
					sizes="(min-width: 1024px) 600px, calc(100vw - 2rem)"
				/>
			</div>
			<div class="rounded-4xl glass p-7 sm:p-12">
				<h2 id="how-title" class="mb-4 text-4xl sm:text-5xl">{t.setupTitle}</h2>
				<p class="max-w-md text-lg text-muted">{t.setupCopy}</p>
				<ol class="mt-8">
					{#each steps as [title, copy], i (title)}
						<li class="flex gap-5 border-t border-ink/10 py-4">
							<span class="w-6 font-display text-3xl leading-none text-accent">{i + 1}</span>
							<div>
								<h3 class="font-sans text-base font-bold tracking-normal">{title}</h3>
								<p class="mt-1 text-muted">{copy}</p>
							</div>
						</li>
					{/each}
				</ol>
			</div>
		</section>

		<section
			class="grid items-center gap-8 rounded-4xl glass bg-linear-135 from-accent/15 via-pink-400/10 to-amber-300/15 p-5 sm:p-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16 lg:py-5 lg:pr-5 lg:pl-16"
			aria-labelledby="privacy-title"
		>
			<div>
				<h2 id="privacy-title" class="mb-4 text-4xl sm:text-5xl">{t.privacyTitle}</h2>
				<p class="max-w-md text-lg text-muted">{t.privacyCopy}</p>
				<ul class="mt-8 grid gap-3.5">
					{#each facts as fact (fact)}
						<li class="flex gap-3 font-semibold">
							<svg
								class="mt-0.5 size-5 shrink-0 text-accent"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2.4"
								stroke-linecap="round"
								stroke-linejoin="round"><path d="M20 6 9 17l-5-5" /></svg
							>{fact}
						</li>
					{/each}
				</ul>
			</div>
			<div class="aspect-4/5 overflow-hidden rounded-3xl">
				<Photo
					name="painting"
					alt={t.paintingAlt}
					sizes="(min-width: 1024px) 480px, calc(100vw - 4.5rem)"
				/>
			</div>
		</section>

		<aside class="mt-8 rounded-3xl glass px-6 py-5 text-sm text-muted">
			<strong class="text-ink">{t.noticeTitle}</strong>
			{t.noticeCopy}
		</aside>
	</main>

	<footer class="flex flex-wrap justify-between gap-x-4 gap-y-1 py-8 text-sm text-muted">
		<span class="font-bold text-ink">BubbleBoard</span><span>{t.footer}</span>
	</footer>
</div>
