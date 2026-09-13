<script module lang="ts">
	import type { CardKind } from '$lib/kindergarten';

	export type PrintableCard = {
		secret: Uint8Array;
		kind: CardKind;
		/** Who holds the card. The recovery card has no name, so every language can label it. */
		name: string;
		/** A short line under the name, such as the family's classrooms. */
		detail?: string;
	};
</script>

<script lang="ts">
	import { beforeNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import { cardLink, formatCardCode } from '$lib/card';
	import Icon from '$lib/components/Icon.svelte';
	import { messages, teacherName, type Locale } from '$lib/i18n';
	import { appPath } from '$lib/paths';
	import { onMount } from 'svelte';
	import QrCode from './QrCode.svelte';
	import { alert, button, choice, surface } from './ui';

	// New cards, shown once to print or save as a PDF. Card codes are never stored (docs/access-format.md),
	// so this page is the only place they appear. With `confirm`, for setup's two cards, nothing leaves
	// the page until someone ticks that the cards are printed or saved. Cards print plain, on white with a
	// dashed edge to cut along, two to a row, so a classroom's cards take a few sheets and little ink.
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
	<div class="{surface} print:hidden">
		<h1 class="text-3xl focus:outline-none sm:text-4xl" tabindex="-1" bind:this={heading}>
			{t.card.title(cards.length)}
		</h1>
		<p class="mt-3 text-lg text-muted">{confirm ? t.card.setupCopy : t.card.copy}</p>
		<button class="{button.primary} mt-6" type="button" onclick={() => print()}>
			<Icon name="printer" class="size-4" />{t.card.print}
		</button>
	</div>

	<ul class="grid gap-4 print:grid-cols-2">
		{#each cards as card (card.secret)}
			{@const label = teacherName(locale, { name: card.name, recovery: card.kind === 'recovery' })}
			<li
				class="grid break-inside-avoid content-start gap-4 rounded-3xl bg-white p-5 text-ink shadow-xl ring-1 shadow-ink/5 ring-ink/10 print:gap-3 print:rounded-2xl print:border print:border-dashed print:border-ink/40 print:p-4 print:shadow-none print:ring-0"
			>
				<p class="flex items-baseline justify-between gap-3">
					<span class="font-display text-lg">BubbleBoard</span>
					{#if card.kind !== 'recovery'}
						<span class="text-sm font-semibold text-muted">{t.card.kinds[card.kind]}</span>
					{/if}
				</p>
				<div class="flex items-center gap-4">
					<QrCode
						class="size-40 shrink-0"
						text={cardLink(page.url.origin, locale, card.secret)}
						label={t.card.qr(label)}
					/>
					<div class="min-w-0">
						<p class="font-display text-2xl leading-tight">{label}</p>
						{#if card.detail}<p class="mt-1 text-sm text-muted">{card.detail}</p>{/if}
						{#if card.kind === 'family'}<p class="mt-1 text-sm text-muted">{t.card.about}</p>{/if}
					</div>
				</div>
				<div>
					<p class="text-xs text-muted">{t.card.scan(address)}</p>
					<!-- Lines break at the dashes, not inside a group of four. -->
					<p class="mt-1 font-mono text-sm font-semibold tracking-wide wrap-break-word">
						{formatCardCode(card.secret)}
					</p>
				</div>
				<p class="text-xs text-muted">
					{card.kind === 'recovery' ? t.card.recovery : t.card.private}
				</p>
			</li>
		{/each}
	</ul>

	<div class="grid justify-items-start gap-4 print:hidden">
		{#if confirm}
			<label class={choice.card}>
				<input class="sr-only" type="checkbox" bind:checked={confirmed} />
				<span class={choice.box}><Icon name="check" class={choice.check} /></span>
				<span class="font-semibold">{t.card.confirm}</span>
			</label>
			{#if blocked && !confirmed}<p class={alert} role="alert">{t.card.leaveFirst}</p>{/if}
		{/if}
		<button class={button.primary} type="button" disabled={confirm && !confirmed} onclick={ondone}>
			{confirm ? t.card.continue : t.actions.done}
		</button>
	</div>
</section>
