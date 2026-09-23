<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import type { OpenEvent } from '$lib/events/types';
	import { messages, type Locale } from '$lib/i18n';
	import { appPath } from '$lib/paths';
	import ConfirmDialog from './ConfirmDialog.svelte';
	import { getApp } from './state.svelte';
	import { button } from './ui';

	// Changing or removing an event, on its board card and in its gallery, for whoever may change it: the
	// page shows these only then (`app.canChangeEvent`). Removing asks first, and `onremoved` runs once it's gone.
	let { locale, event, onremoved }: { locale: Locale; event: OpenEvent; onremoved?: () => void } =
		$props();
	const app = getApp();
	const t = $derived(messages[locale].app.events);
	let confirming = $state(false);
</script>

<a class={button.quiet} href={appPath(locale, 'event/edit', { id: event.id })}>
	<Icon name="pencil" class="size-4" />{t.edit}
</a>
<button class={button.danger} type="button" onclick={() => (confirming = true)}>
	<Icon name="trash" class="size-4" />{t.remove}
</button>

{#if confirming}
	<ConfirmDialog
		{locale}
		title={t.remove}
		copy={t.removeHint}
		confirmLabel={t.remove}
		danger
		onconfirm={async () => {
			await app.deleteEvent(event);
			confirming = false;
			onremoved?.();
		}}
		onclose={() => (confirming = false)}
	/>
{/if}
