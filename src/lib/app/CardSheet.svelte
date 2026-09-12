<script module lang="ts">
	export type PrintableCard = {
		secret: Uint8Array;
		kind: 'admin' | 'teacher' | 'recovery' | 'family';
		/** Who holds the card. The recovery card has no name. */
		name?: string;
		/** A short line under the name, such as the family's classrooms. */
		detail?: string;
	};
</script>

<script lang="ts">
	import { beforeNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import bubble from '$lib/assets/bubble.svg';
	import favicon from '$lib/assets/favicon.svg';
	import { cardLink, formatCardCode } from '$lib/card';
	import Icon from '$lib/components/Icon.svelte';
	import { messages, type Locale } from '$lib/i18n';
	import { appPath } from '$lib/paths';
	import { onMount } from 'svelte';
	import QrCode from './QrCode.svelte';
	import { alert, button } from './ui';

	// New cards, shown once to print or save as a PDF. Card codes are never stored (docs/access-format.md),
	// so this page is the only place they appear. With `confirm`, for setup's two cards, nothing leaves
	// the page until someone ticks that the cards are printed or saved.
	let {
		locale,
		cards,
		confirm = false,
		ondone
	}: { locale: Locale; cards: PrintableCard[]; confirm?: boolean; ondone: () => void } = $props();

	const t = $derived(messages[locale].app);
	/** Where a code can be typed, without the protocol, so it's short enough to read off paper. */
	const address = $derived(`${page.url.host}${appPath(locale)}`);
	let confirmed = $state(false);
	let blocked = $state(false);
	let heading = $state<HTMLHeadingElement>();

	onMount(() => {
		// The sheet takes the place of a page that may have been scrolled or focused further down.
		window.scrollTo({ top: 0 });
		heading?.focus();
	});

	beforeNavigate((navigation) => {
		if (!confirm || confirmed) return;
		navigation.cancel();
		blocked = true;
	});
</script>

<section class="grid gap-5">
	<div class="rounded-4xl glass p-6 sm:p-8 print:hidden">
		<h1 class="text-3xl focus:outline-none sm:text-4xl" tabindex="-1" bind:this={heading}>
			{t.card.title(cards.length)}
		</h1>
		<p class="mt-3 text-lg text-muted">{confirm ? t.card.setupCopy : t.card.copy}</p>
		<button class="{button.primary} mt-6" type="button" onclick={() => print()}>
			<Icon name="printer" class="size-4" />{t.card.print}
		</button>
	</div>

	<ul class="grid gap-4 print:gap-10">
		{#each cards as card (card.secret)}
			{@const label = card.kind === 'recovery' ? t.card.kinds.recovery : (card.name ?? '')}
			<li
				class="relative isolate break-inside-avoid overflow-hidden rounded-3xl glass p-6 sm:p-7 print:border print:border-ink/40 print:shadow-none"
			>
				<img
					src={bubble}
					alt=""
					class="pointer-events-none absolute -top-10 -right-10 -z-10 size-32 print:hidden"
				/>
				<p class="flex items-center justify-between gap-3">
					<span class="inline-flex items-center gap-2 font-bold">
						<img src={favicon} alt="" width="28" height="28" />BubbleBoard
					</span>
					{#if card.kind !== 'recovery'}
						<span class="text-sm font-semibold text-muted">{t.card.kinds[card.kind]}</span>
					{/if}
				</p>
				<div class="mt-5 grid items-center gap-5 sm:grid-cols-[auto_1fr]">
					<QrCode
						class="size-44 rounded-2xl bg-white p-2 text-ink"
						text={cardLink(page.url.origin, locale, card.secret)}
						label={t.card.qr(label)}
					/>
					<div class="min-w-0">
						<p class="font-display text-3xl leading-tight">{label}</p>
						{#if card.detail}<p class="mt-1 text-muted">{card.detail}</p>{/if}
						{#if card.kind === 'family'}<p class="mt-1 text-muted">{t.card.about}</p>{/if}
						<p class="mt-4 text-sm text-muted">{t.card.scan(address)}</p>
						<!-- Lines break at the dashes, not inside a group of four. -->
						<p class="mt-1 font-mono text-lg font-semibold tracking-wide wrap-break-word">
							{formatCardCode(card.secret)}
						</p>
						<p class="mt-3 text-xs text-muted">
							{card.kind === 'recovery' ? t.card.recovery : t.card.private}
						</p>
					</div>
				</div>
			</li>
		{/each}
	</ul>

	<div class="grid justify-items-start gap-4 print:hidden">
		{#if confirm}
			<label class="flex items-center gap-3 font-semibold">
				<input class="size-5 accent-accent" type="checkbox" bind:checked={confirmed} />
				{t.card.confirm}
			</label>
			{#if blocked && !confirmed}<p class={alert} role="alert">{t.card.leaveFirst}</p>{/if}
		{/if}
		<button class={button.primary} type="button" disabled={confirm && !confirmed} onclick={ondone}>
			{confirm ? t.card.continue : t.actions.done}
		</button>
	</div>
</section>
