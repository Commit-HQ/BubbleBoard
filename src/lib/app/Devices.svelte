<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import IconTile from '$lib/components/IconTile.svelte';
	import { errorMessage, messages, type Locale } from '$lib/i18n';
	import type { FamilyDevice } from '$lib/device';
	import { onMount } from 'svelte';
	import ConfirmDialog from './ConfirmDialog.svelte';
	import FieldForm from './FieldForm.svelte';
	import { getApp, Task } from './state.svelte';
	import { alert, button, surface } from './ui';

	// The devices connected for a family, in a family device's Settings: who uses each, once someone said, with
	// this device's name to change and the others to remove. A removed device connects again with the family's
	// QR code, so the info button says what keeps it out: the kindergarten replacing that QR code, which signs
	// out every device (docs/access-format.md). The names are for the family alone.
	let { locale }: { locale: Locale } = $props();
	const app = getApp();
	const t = $derived(messages[locale].app);
	const loading = new Task();
	let naming = $state(false);
	let about = $state(false);
	let removing = $state.raw<FamilyDevice>();

	// Another device may have connected or been removed since this one last loaded them.
	onMount(() => void loading.run(() => app.loadDevices()));
</script>

<section class={surface} aria-labelledby="devices-title">
	<IconTile icon="phone" tone="ink" />
	<div class="mt-5 flex items-center gap-1">
		<h2 id="devices-title" class="text-3xl">{t.devices.title}</h2>
		<button
			class={button.icon}
			type="button"
			aria-label={t.devices.about}
			aria-expanded={about}
			aria-controls="devices-about"
			onclick={() => (about = !about)}
		>
			<Icon name="info" class="size-5" />
		</button>
	</div>
	<p class="mt-1 text-muted">{t.devices.copy}</p>
	<p id="devices-about" class="mt-3 rounded-2xl bg-ink/5 px-4 py-3 text-sm" hidden={!about}>
		{t.devices.aboutCopy}
	</p>
	{#if loading.error}
		<p class="{alert} mt-4" role="alert">{errorMessage(locale, loading.error)}</p>
	{/if}
	<ul class="mt-6 grid gap-2">
		{#each app.devices as device (device.id)}
			<li class="rounded-3xl bg-white/60 px-5 py-3 ring-1 ring-ink/10">
				{#if device.current && naming}
					<div class="py-2">
						<FieldForm
							{locale}
							label={t.devices.nameLabel}
							value={device.name}
							placeholder={t.devices.namePlaceholder}
							hint={t.devices.nameHint}
							submitLabel={t.actions.save}
							onsubmit={async (name) => {
								await app.nameDevice(name);
								naming = false;
							}}
							oncancel={() => (naming = false)}
						/>
					</div>
				{:else}
					<div class="flex min-h-11 flex-wrap items-center gap-x-3">
						<p class="min-w-0 flex-1 wrap-break-word">
							<span class="font-semibold {device.name ? '' : 'text-muted'}">
								{device.name ?? t.devices.unnamed}
							</span>
							{#if device.current}
								<span class="block text-sm text-muted">{t.devices.current}</span>
							{/if}
						</p>
						{#if device.current}
							<button class={button.quiet} type="button" onclick={() => (naming = true)}>
								<Icon name="pencil" class="size-4" />
								{device.name ? t.devices.changeName : t.devices.addName}
							</button>
						{:else}
							<button class={button.danger} type="button" onclick={() => (removing = device)}>
								{t.actions.remove}
							</button>
						{/if}
					</div>
				{/if}
			</li>
		{/each}
	</ul>
</section>

{#if removing}
	{@const device = removing}
	<ConfirmDialog
		{locale}
		title={t.devices.removeTitle(device.name ?? t.devices.unnamed)}
		copy={t.devices.removeCopy}
		confirmLabel={t.actions.remove}
		danger
		onconfirm={async () => {
			await app.removeDevice(device.id);
			removing = undefined;
		}}
		onclose={() => (removing = undefined)}
	/>
{/if}
