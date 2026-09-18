<script lang="ts">
	import { messages, type Locale } from '$lib/i18n';
	import type { MessagePolicy } from '$lib/messages';
	let {
		locale,
		policy,
		creating = false
	}: { locale: Locale; policy: MessagePolicy; creating?: boolean } = $props();
	const t = $derived(messages[locale].app.messaging);
</script>

<div class="grid gap-2 rounded-2xl bg-white/70 p-4 text-sm">
	{#if !policy.enabled}<p class="font-semibold">{t.disabled}</p>
	{:else if !policy.allowed}<p class="font-semibold">{t.outside}</p>{/if}
	<p>{t.quota(Math.max(0, policy.monthlyLimit - policy.used))}</p>
	{#if creating && policy.used >= policy.monthlyLimit}<p>{t.noQuota}</p>{/if}
	<details>
		<summary class="min-h-11 cursor-pointer py-2">{t.schedule}</summary>
		<dl class="grid grid-cols-2 gap-2">
			{#each policy.schedule as day, index}<dt>{t.days[index]}</dt>
				<dd>{day ? `${day.start}–${day.end}` : t.offDay}</dd>{/each}
		</dl>
	</details>
	<p class="text-muted">{t.holiday}</p>
</div>
