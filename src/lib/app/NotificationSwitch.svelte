<script lang="ts">
	import { errorMessage, messages, type Locale } from '$lib/i18n';
	import type { Snippet } from 'svelte';
	import { getApp, Task } from './state.svelte';
	import { alert, button } from './ui';

	// The buttons that turn this device's notifications on and off, on home's card and in Settings, with any
	// other buttons beside them.
	let { locale, children }: { locale: Locale; children?: Snippet } = $props();
	const app = getApp();
	const t = $derived(messages[locale].app.notifications);
	const task = new Task();
</script>

{#if task.error}
	<p class="{alert} mt-4" role="alert">{errorMessage(locale, task.error)}</p>
{/if}
{#if app.notifications === 'off' || app.notifications === 'on' || children}
	<div class="mt-6 flex flex-wrap gap-2">
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
		{:else if app.notifications === 'on'}
			<button
				class={button.secondary}
				type="button"
				disabled={task.busy}
				onclick={() => task.run(() => app.turnOffNotifications())}
			>
				{t.turnOff}
			</button>
		{/if}
		{@render children?.()}
	</div>
{/if}
