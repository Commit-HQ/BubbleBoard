<script lang="ts">
	import shareImage from '$lib/assets/photos/share.jpg';
	import ActionLink from '$lib/components/ActionLink.svelte';
	import Bubble from '$lib/components/Bubble.svelte';
	import Faq from '$lib/components/Faq.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import Screenshot from '$lib/components/Screenshot.svelte';
	import { replaceState } from '$app/navigation';
	import { messages } from '$lib/i18n';
	import { appPath, explorePath, exploreRoles, homePath, type ExploreRole } from '$lib/paths';
	import { absoluteUrl } from '$lib/project';
	import type { PageProps } from './$types';

	// A walk through the app for parents or for teachers: one screen a step, in a kindergarten that's set up
	// already. The steps sit side by side in a row that snaps as it's swiped, and every step carries its own
	// links to the steps before and after it and to each of the others, so the page works as plain HTML. In the
	// browser, those links slide the row sideways instead of jumping to the step, and the arrow keys do the same.
	let { data, params }: PageProps = $props();
	const t = $derived(messages[data.locale].explore);
	const role = $derived(params.role as ExploreRole);
	const other = $derived(exploreRoles.find((option) => option !== role)!);
	const steps = $derived(t[role]);
	let row = $state<HTMLOListElement>();
	/** The step just moved to, for screen readers, which can't see the row slide. */
	let announced = $state('');

	const round =
		'grid size-11 shrink-0 place-items-center rounded-full glass hover:bg-white/75 motion-safe:transition-colors';

	const slides = () => [...(row?.children ?? [])] as HTMLElement[];

	/** The step nearest the middle of the row, which is the one in view. */
	function inView() {
		if (!row) return 0;
		const middle = row.scrollLeft + row.clientWidth / 2;
		const distances = slides().map((slide) =>
			Math.abs(slide.offsetLeft + slide.offsetWidth / 2 - middle)
		);
		return distances.indexOf(Math.min(...distances));
	}

	/**
	 * Slides the row to a step without moving the page. Focus follows to the same control of the new step, so
	 * pressing Enter again keeps going; `from` is the link that was followed.
	 */
	function show(index: number, from?: HTMLAnchorElement) {
		const slide = slides()[index];
		if (!row || !slide) return;
		const was = inView();
		row.scrollTo({
			left: slide.offsetLeft - (row.clientWidth - slide.offsetWidth) / 2,
			behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
		});
		replaceState(`#step-${index + 1}`, {});
		announced = `${t.step(index + 1, steps.length)}: ${steps[index].title}`;
		if (!from) return;
		const dots = [...slide.querySelectorAll<HTMLAnchorElement>('nav ol a')];
		const arrows = [...slide.querySelectorAll<HTMLAnchorElement>('nav a')].filter(
			(link) => !dots.includes(link) && link.offsetParent
		);
		const dot = from.closest('ol') !== row && dots[index];
		(dot || (index > was ? arrows.at(-1) : arrows[0]))?.focus({ preventScroll: true });
	}

	function follow(event: MouseEvent) {
		if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
		const link = (event.target as Element).closest<HTMLAnchorElement>('a[href^="#step-"]');
		if (!link) return;
		event.preventDefault();
		show(Number(link.hash.slice('#step-'.length)) - 1, link);
	}

	function arrowKeys(event: KeyboardEvent) {
		if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
		const by = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
		const next = inView() + by;
		if (!by || next < 0 || next >= steps.length) return;
		event.preventDefault();
		show(next);
	}
</script>

<svelte:window onkeydown={arrowKeys} />

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
		<!-- The row is as tall as its tallest step, and padded so the steps' shadows aren't cut off. Each step's
		controls come before its words, where they're in view as the page opens and stay in one place from step to
		step, whatever the words' length. -->
		<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
		<ol
			bind:this={row}
			class="relative -mx-4 flex snap-x snap-mandatory [scrollbar-width:none] gap-4 overflow-x-auto px-4 pb-10 motion-safe:scroll-smooth sm:-mx-8 sm:px-8 lg:-mx-10 lg:px-10"
			onclick={follow}
		>
			{#each steps as step, index (step.shot)}
				{@const number = index + 1}
				{@const last = number === steps.length}
				<li
					id="step-{number}"
					class="grid w-full shrink-0 snap-center scroll-mt-24 content-start gap-x-16 gap-y-8 rounded-4xl glass p-6 sm:p-10 lg:grid-cols-[auto_1fr] lg:content-center lg:items-center lg:px-16 lg:py-10"
				>
					<div class="flex min-w-0 flex-col">
						<!-- Wide screens keep room for the longest step, so the words and the controls above them stay where
						they are from step to step. -->
						<div class="lg:min-h-76">
							<p class="font-semibold text-muted">{t.step(number, steps.length)}</p>
							<h2 class="mt-2 max-w-md text-3xl sm:text-4xl">{step.title}</h2>
							<p class="mt-4 max-w-md text-lg text-muted">{step.copy}</p>
						</div>

						<nav
							class="order-first mb-6 flex items-center justify-between gap-3 lg:mb-8 lg:justify-start"
							aria-label={t.stepsLabel}
						>
							{#if index}
								<a class={round} href="#step-{number - 1}" aria-label={t.previous}>
									<Icon name="chevronLeft" class="size-5" />
								</a>
							{:else}
								<span class="{round} opacity-40" aria-hidden="true">
									<Icon name="chevronLeft" class="size-5" />
								</span>
							{/if}
							<ol class="flex">
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
							<!-- A round arrow where there's no room for a word, and the word beside it otherwise. The last
							step leads to the other walk. -->
							<a
								class="{round} bg-ink! text-white sm:hidden"
								href={last ? explorePath(data.locale, other) : `#step-${number + 1}`}
								aria-label={last ? t.other[role] : t.next}
							>
								<Icon name="arrowRight" class="size-5" />
							</a>
							<span class="max-sm:hidden">
								<ActionLink
									href={last ? explorePath(data.locale, other) : `#step-${number + 1}`}
									label={last ? t.other[role] : t.next}
									icon="arrowRight"
								/>
							</span>
						</nav>
					</div>
					<!-- After the words for screen readers and on phones; to their left on wide screens. -->
					<div class="justify-self-center lg:order-first">
						<Screenshot name={step.shot} locale={data.locale} alt={step.screen} eager={index < 2} />
					</div>
				</li>
			{/each}
		</ol>
		<p class="sr-only" aria-live="polite">{announced}</p>
		<p class="max-w-2xl text-sm text-muted">{t.sample}</p>
	</section>

	<Faq locale={data.locale} />

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
