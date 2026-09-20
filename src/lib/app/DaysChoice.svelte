<script lang="ts">
	import { messages, type Locale } from '$lib/i18n';
	import { day, noticeDays } from '$lib/notices';
	import { choice } from './ui';

	// How long something stays up, chosen the same way wherever it's asked: the days as tiles, with the day it
	// comes down under them. `from` is when it first went up, so editing a notice counts its days from then.
	let {
		locale,
		legend,
		from = Date.now(),
		days = $bindable()
	}: { locale: Locale; legend: string; from?: number; days: number } = $props();

	const t = $derived(messages[locale].app.notices);
	const id = $props.id();
	const until = $derived(
		new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long' }).format(from + days * day)
	);
</script>

<fieldset>
	<legend class="mb-3 font-semibold">{legend}</legend>
	<div class="grid grid-cols-4 gap-2 sm:grid-cols-7">
		{#each noticeDays as count (count)}
			<!-- Forced colours drop the dark fill, so the chosen number is underlined there instead. -->
			<label class="{choice.option} group grid justify-items-center gap-1 rounded-2xl px-1 py-3">
				<input class="sr-only" type="radio" name="{id}-days" value={count} bind:group={days} />
				<span class="sr-only">{t.dayCount(count)}</span>
				<span
					class="font-display text-3xl leading-none forced-colors:group-has-checked:underline"
					aria-hidden="true">{count}</span
				>
				<span
					class="text-xs font-semibold text-muted group-has-checked:text-white/80"
					aria-hidden="true">{t.dayUnit(count)}</span
				>
			</label>
		{/each}
	</div>
	<p class="mt-3 text-sm text-muted">{t.until(until)}</p>
</fieldset>
