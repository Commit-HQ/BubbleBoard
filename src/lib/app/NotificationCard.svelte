<script lang="ts">
	import IconTile from '$lib/components/IconTile.svelte';
	import { messages, type Locale } from '$lib/i18n';
	import NotificationSwitch from './NotificationSwitch.svelte';
	import { getApp } from './state.svelte';
	import { button, surface } from './ui';

	// The card on home that turns notifications on (next-step-plan.md). Not now puts it away on this device,
	// and Settings keep the switch. Where notifications can't work, it isn't shown.
	let { locale }: { locale: Locale } = $props();
	const app = getApp();
	const t = $derived(messages[locale].app.notifications);
</script>

{#if !app.notificationCardHidden && (app.notifications === 'off' || app.notifications === 'blocked')}
	<section class="{surface} flex items-start gap-4" aria-labelledby="notifications-card">
		<IconTile icon="bell" />
		<div class="min-w-0">
			<h2 id="notifications-card" class="text-2xl">{t.cardTitle}</h2>
			<p class="mt-2 text-muted">{app.notifications === 'blocked' ? t.blocked : t.cardCopy}</p>
			<NotificationSwitch {locale}>
				<button class={button.quiet} type="button" onclick={() => app.hideNotificationCard()}>
					{t.notNow}
				</button>
			</NotificationSwitch>
		</div>
	</section>
{/if}
