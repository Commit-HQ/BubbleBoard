<script lang="ts">
	import IconTile from '$lib/components/IconTile.svelte';
	import { errorMessage, messages, type Locale } from '$lib/i18n';
	import { onMount } from 'svelte';
	import { getApp, Task } from './state.svelte';
	import { alert, button, surface } from './ui';

	// The card on home that turns notifications on (next-step-plan.md). Not now hides it on this device, and
	// Settings keep the switch. Where notifications can't work, it isn't shown.
	let { locale }: { locale: Locale } = $props();
	const app = getApp();
	const t = $derived(messages[locale].app.notifications);
	const task = new Task();
	const hiddenKey = 'bubbleboard-notification-card';
	let hidden = $state(true);

	onMount(() => {
		try {
			hidden = localStorage.getItem(hiddenKey) === 'hidden';
		} catch {
			hidden = false;
		}
	});

	function hide() {
		hidden = true;
		try {
			localStorage.setItem(hiddenKey, 'hidden');
		} catch {
			// Without storage, the card comes back next time.
		}
	}
</script>

{#if !hidden && (app.notifications === 'off' || app.notifications === 'blocked')}
	<section class="{surface} flex items-start gap-4" aria-labelledby="notifications-card">
		<IconTile icon="bell" />
		<div class="min-w-0">
			<h2 id="notifications-card" class="text-2xl">{t.cardTitle}</h2>
			<p class="mt-2 text-muted">{app.notifications === 'blocked' ? t.blocked : t.cardCopy}</p>
			{#if task.error}
				<p class="{alert} mt-4" role="alert">{errorMessage(locale, task.error)}</p>
			{/if}
			<div class="mt-5 flex flex-wrap gap-2">
				{#if app.notifications === 'off'}
					<!-- The permission request must come straight from this tap. -->
					<button
						class={button.primary}
						type="button"
						disabled={task.busy}
						onclick={() => task.run(() => app.turnOnNotifications(locale))}
					>
						{t.turnOn}
					</button>
				{/if}
				<button class={button.quiet} type="button" onclick={hide}>{t.notNow}</button>
			</div>
		</div>
	</section>
{/if}
