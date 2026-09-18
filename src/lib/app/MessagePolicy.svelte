<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { messages, type Locale } from '$lib/i18n';
	import { remainingMessages, type MessagePolicy } from '$lib/messages';

	// What a family may send right now, above the box it writes in: whether its classroom takes messages at
	// this hour, whether this one spends an inquiry, and how many are left this month. The hours are spelled
	// out when they're in the way, and while a new inquiry is being written; as today's window runs out, a
	// red line counts it down. Teachers never see any of it.
	let {
		locale,
		policy,
		charged,
		allowed,
		closing,
		full = false
	}: {
		locale: Locale;
		policy: MessagePolicy;
		charged: boolean;
		/** Whether this classroom is taking messages at this moment, by the device's clock. */
		allowed: boolean;
		/** Minutes until today's window closes, while that's soon enough to say. */
		closing?: number;
		full?: boolean;
	} = $props();
	const t = $derived(messages[locale].app.messaging);
	const remaining = $derived(remainingMessages(policy));
</script>

<div class="grid rounded-2xl bg-white/60 px-4 py-2 text-sm ring-1 ring-ink/5">
	<p class="flex min-h-9 items-center gap-2">
		{#if !policy.enabled}
			<Icon name="lock" class="size-4 shrink-0 text-muted" /><span class="font-semibold"
				>{t.disabled}</span
			>
		{:else if !allowed}
			<Icon name="clock" class="size-4 shrink-0 text-muted" /><span class="font-semibold"
				>{t.outside}</span
			>
		{:else if !charged}
			<Icon name="check" class="size-4 shrink-0 text-muted" /><span class="text-muted"
				>{t.free}</span
			>
		{:else if remaining}
			<Icon name="message" class="size-4 shrink-0 text-muted" /><span
				>{t.charged}
				<span class="text-muted">{t.quota(remaining)}</span></span
			>
		{:else}
			<Icon name="alert" class="size-4 shrink-0 text-muted" /><span class="font-semibold"
				>{t.noQuota}</span
			>
		{/if}
	</p>
	{#if closing !== undefined}
		<p class="flex min-h-9 items-center gap-2 font-semibold text-red-800" role="status">
			<Icon name="clock" class="size-4 shrink-0" />{t.closingSoon(closing)}
		</p>
	{/if}
	{#if policy.enabled && (full || !allowed)}
		<details>
			<summary class="flex min-h-9 cursor-pointer items-center font-semibold text-muted">
				{t.schedule}
			</summary>
			<dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 pb-2">
				{#each policy.schedule as day, index (index)}
					<dt>{t.days[index]}</dt>
					<dd class="text-muted">{day ? `${day.start}–${day.end}` : t.offDay}</dd>
				{/each}
			</dl>
			<p class="pb-2 text-muted">{t.holiday}</p>
		</details>
	{/if}
</div>
