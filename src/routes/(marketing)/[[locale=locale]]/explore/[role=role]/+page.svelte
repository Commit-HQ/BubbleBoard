<script lang="ts">
	import shareImage from '$lib/assets/photos/share.jpg';
	import ActionLink from '$lib/components/ActionLink.svelte';
	import Bubble from '$lib/components/Bubble.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import Screenshot from '$lib/components/Screenshot.svelte';
	import { messages } from '$lib/i18n';
	import { appPath, explorePath, exploreRoles, homePath, type ExploreRole } from '$lib/paths';
	import { absoluteUrl } from '$lib/project';
	import type { PageProps } from './$types';

	// A walk through the app for parents or for teachers: one screen a step, in a kindergarten that's set up
	// already. Landing pages run no JavaScript, so the steps sit side by side in a row that snaps as it's
	// swiped, and every step carries its own links to the steps before and after it and to each of the others.
	let { data, params }: PageProps = $props();
	const t = $derived(messages[data.locale].explore);
	const role = $derived(params.role as ExploreRole);
	const other = $derived(exploreRoles.find((option) => option !== role)!);
	const steps = $derived(t[role]);

	const round =
		'grid size-11 shrink-0 place-items-center rounded-full glass hover:bg-white/75 motion-safe:transition-colors';
</script>

<svelte:head>
	<title>BubbleBoard · {t.title}</title>
	<meta name="description" content={t.description} />
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="BubbleBoard" />
	<meta property="og:title" content="BubbleBoard · {t.title}" />
	<meta property="og:description" content={t.description} />
	<meta property="og:url" content={absoluteUrl(explorePath(data.locale, role))} />
	<meta property="og:image" content={absoluteUrl(shareImage)} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta name="twitter:card" content="summary_large_image" />
</svelte:head>

<div class="flex flex-col gap-10 pt-8 pb-20 lg:gap-14 lg:pt-12 lg:pb-28">
	<!-- Short, so the first step's screen shows without scrolling: on wide screens the choice sits beside the words. -->
	<header class="flex flex-wrap items-end justify-between gap-x-10 gap-y-7">
		<div>
			<h1 class="mb-4 text-[2.75rem] leading-none sm:text-6xl">
				{t.heading}
				<span class="block text-sunrise xl:inline">{t.headingAccent}</span>
			</h1>
			<p class="max-w-lg text-lg text-muted">{t.copy}</p>
		</div>
		<nav class="inline-flex rounded-full bg-ink/5 p-0.5" aria-label={t.roleLabel}>
			{#each exploreRoles as option (option)}
				<!-- Forced colours drop the dark fill, so the walk that's open is underlined there instead. -->
				<a
					class="grid min-h-11 place-items-center rounded-full px-6 font-bold text-muted transition-colors aria-[current=page]:bg-ink aria-[current=page]:text-white forced-colors:aria-[current=page]:underline"
					href={explorePath(data.locale, option)}
					aria-current={option === role ? 'page' : undefined}>{t.roles[option]}</a
				>
			{/each}
		</nav>
	</header>

	<section aria-label={t.roles[role]}>
		<!-- The row is as tall as its tallest step, and padded so the steps' shadows aren't cut off. Following a
		link to a step brings it to the top of the window, under the header. -->
		<ol
			class="-mx-4 flex snap-x snap-mandatory [scrollbar-width:none] gap-4 overflow-x-auto px-4 pb-10 motion-safe:scroll-smooth sm:-mx-8 sm:px-8 lg:-mx-10 lg:px-10"
		>
			{#each steps as step, index (step.shot)}
				{@const number = index + 1}
				<li
					id="step-{number}"
					class="grid w-full shrink-0 snap-center scroll-mt-24 items-start gap-8 rounded-4xl glass p-6 sm:p-10 lg:grid-cols-[auto_1fr] lg:items-center lg:gap-16 lg:px-16 lg:py-10"
				>
					<div class="min-w-0">
						<p class="font-semibold text-muted">{t.step(number, steps.length)}</p>
						<h2 class="mt-2 max-w-md text-3xl sm:text-4xl">{step.title}</h2>
						<p class="mt-4 max-w-md text-lg text-muted">{step.copy}</p>

						<nav class="mt-7 grid justify-items-start gap-4" aria-label={t.stepsLabel}>
							<ol class="-ml-1.5 flex">
								{#each steps as { title }, dot (title)}
									<li>
										<a
											class="group grid size-6 place-items-center rounded-full"
											href="#step-{dot + 1}"
											aria-label="{dot + 1}. {title}"
											aria-current={dot === index ? 'step' : undefined}
										>
											<span
												class="size-2.5 rounded-full bg-ink/20 transition-colors group-hover:bg-ink/50 group-aria-[current=step]:w-5 group-aria-[current=step]:bg-accent forced-colors:bg-[CanvasText] forced-colors:group-aria-[current=step]:bg-[Highlight]"
											></span>
										</a>
									</li>
								{/each}
							</ol>
							<div class="flex items-center gap-3">
								{#if index}
									<a class={round} href="#step-{number - 1}" aria-label={t.previous}>
										<Icon name="chevronLeft" class="size-5" />
									</a>
								{:else}
									<span class="{round} opacity-40" aria-hidden="true">
										<Icon name="chevronLeft" class="size-5" />
									</span>
								{/if}
								{#if number < steps.length}
									<ActionLink href="#step-{number + 1}" label={t.next} icon="arrowRight" />
								{:else}
									<ActionLink
										href={explorePath(data.locale, other)}
										label={t.other[role]}
										icon="arrowRight"
									/>
								{/if}
							</div>
						</nav>
					</div>
					<!-- After the words for screen readers and on phones; to their left on wide screens. -->
					<div class="justify-self-center lg:order-first">
						<Screenshot name={step.shot} locale={data.locale} alt={step.screen} eager={!index} />
					</div>
				</li>
			{/each}
		</ol>
		<p class="max-w-2xl text-sm text-muted">{t.sample}</p>
	</section>

	<section
		class="relative isolate overflow-hidden rounded-4xl glass bg-linear-135 from-apricot/15 via-blush/10 to-accent/15 px-6 py-12 text-center sm:px-12 sm:py-16"
		aria-labelledby="closing-title"
	>
		<Bubble class="-top-20 -right-20 -z-10 size-48 sm:-top-24 sm:-right-16 sm:size-72" />
		<h2 id="closing-title" class="mx-auto mb-4 max-w-2xl text-4xl sm:text-5xl">
			{t.closing.title}
		</h2>
		<p class="mx-auto max-w-2xl text-lg text-muted">{t.closing.copy}</p>
		<div class="mt-9 flex flex-wrap items-center justify-center gap-x-6 gap-y-4">
			<ActionLink
				href={appPath(data.locale)}
				label={messages[data.locale].hero.open}
				icon="arrowRight"
			/>
			<a
				class="flex items-center gap-2 font-semibold text-muted hover:text-ink"
				href="{homePath(data.locale)}#kindergartens"
			>
				{messages[data.locale].hero.cta}<Icon name="arrowRight" class="size-4 shrink-0" />
			</a>
		</div>
	</section>
</div>
