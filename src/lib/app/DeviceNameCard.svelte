<script lang="ts">
	import IconTile from '$lib/components/IconTile.svelte';
	import { messages, type Locale } from '$lib/i18n';
	import FieldForm from './FieldForm.svelte';
	import { getApp } from './state.svelte';
	import { surface } from './ui';

	// The card on a family device's home that asks who uses it, until it has a name, so the family's list of
	// connected devices in Settings says who is who. Not now puts it away on this device, and Settings keep the
	// name to add later.
	let { locale }: { locale: Locale } = $props();
	const app = getApp();
	const t = $derived(messages[locale].app);
	const current = $derived(app.devices.find((device) => device.current));
</script>

{#if !app.hiddenCards.includes('device-name') && current && !current.name}
	<section class="{surface} flex items-start gap-4">
		<IconTile icon="phone" />
		<div class="min-w-0 flex-1">
			<FieldForm
				{locale}
				label={t.devices.nameLabel}
				placeholder={t.devices.namePlaceholder}
				hint={t.devices.cardCopy}
				submitLabel={t.actions.save}
				cancelLabel={t.devices.notNow}
				focus={false}
				onsubmit={(name) => app.nameDevice(name)}
				oncancel={() => app.hideCard('device-name')}
			/>
		</div>
	</section>
{/if}
