<script lang="ts">
	import { page } from '$app/state';
	import { cardLink, formatCardCode } from '$lib/card';
	import Icon from '$lib/components/Icon.svelte';
	import IconTile from '$lib/components/IconTile.svelte';
	import type { FamilyDevice } from '$lib/device';
	import { errorMessage, formatDateTime, messages, type Locale } from '$lib/i18n';
	import { appPath } from '$lib/paths';
	import { onMount } from 'svelte';
	import ConfirmDialog from './ConfirmDialog.svelte';
	import FieldForm from './FieldForm.svelte';
	import QrCode from './QrCode.svelte';
	import { getApp, Task } from './state.svelte';
	import { alert, button, surface } from './ui';

	// A family's devices, in a family device's Settings: those connected, with who uses each once someone said,
	// this device's name to change and the others to remove, and under them adding another, such as
	// grandparents' phones, without the printed QR code. Adding shows a one-time card, which connects one device
	// within a day, to scan or to send as a link; like a new printed card's, its code is kept only while it shows
	// (docs/access-format.md). A removed device connects again with the family's QR code, so the info button says
	// what keeps it out: the kindergarten replacing that QR code, which signs out every device. The names are for
	// the family alone.
	let { locale }: { locale: Locale } = $props();
	const app = getApp();
	const t = $derived(messages[locale].app);
	const loading = new Task();
	const adding = new Task();
	/** Where the code can be typed, as a printed card says. */
	const address = $derived(`${page.url.host}${appPath(locale)}`);
	/** Where the browser can't share a link, it's copied instead. */
	const canShare = 'share' in navigator;
	let naming = $state(false);
	let about = $state(false);
	let removing = $state.raw<FamilyDevice>();
	let shown = $state.raw<{ secret: Uint8Array<ArrayBuffer>; until: number }>();
	let copied = $state(false);
	let description = $state<HTMLParagraphElement>();

	// Another device may have connected or been removed since this one last loaded them.
	onMount(() => void loading.run(() => app.loadDevices()));

	// The code takes the place of the button that asked for it, so focus moves to what it says.
	$effect(() => {
		if (shown) description?.focus();
	});

	function show() {
		return adding.run(async () => {
			shown = await app.addDevice();
			copied = false;
		});
	}

	/** Puts the code away. The device it connected, if any, is on the list now. */
	function done() {
		shown = undefined;
		void loading.run(() => app.loadDevices());
	}

	function share(link: string) {
		return adding.run(async () => {
			if (!canShare) {
				await navigator.clipboard.writeText(link);
				copied = true;
				return;
			}
			try {
				await navigator.share({ text: t.addDevice.shareText, url: link });
			} catch (cause) {
				// Closing the share sheet shares nothing, as it should.
				if (!(cause instanceof DOMException && cause.name === 'AbortError')) throw cause;
			}
		});
	}
</script>

<section class={surface} aria-labelledby="devices-title">
	<IconTile icon="users" tone="ink" />
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

	<div class="mt-6 border-t border-ink/10 pt-6">
		{#if !app.canAddDevices}
			<p class="text-muted">{t.addDevice.connectAgain}</p>
		{:else if shown}
			{@const link = cardLink(page.url.origin, locale, shown.secret)}
			{@const until = formatDateTime(locale, shown.until)}
			<p class="text-muted focus:outline-none" tabindex="-1" bind:this={description}>
				{t.addDevice.scan(until)}
			</p>
			<div
				class="mt-6 grid justify-items-center gap-4 rounded-3xl bg-white p-5 text-center text-ink ring-1 ring-ink/10"
			>
				<QrCode class="size-60 max-w-full" text={link} label={t.addDevice.qr} />
				<div>
					<p class="text-xs text-muted">{t.card.scan(address)}</p>
					<!-- Lines break at the dashes, not inside a group of four. -->
					<p class="mt-1 font-mono text-sm font-semibold tracking-wide wrap-break-word">
						{formatCardCode(shown.secret)}
					</p>
				</div>
			</div>
			<div class="mt-6 flex flex-wrap gap-2">
				<button
					class={button.primary}
					type="button"
					disabled={adding.busy}
					onclick={() => share(link)}
				>
					<Icon name={canShare ? 'share' : 'link'} class="size-4" />
					{canShare ? t.addDevice.share : t.addDevice.copyLink}
				</button>
				<button class={button.secondary} type="button" onclick={done}>{t.actions.done}</button>
			</div>
			{#if copied}
				<p class="mt-3 font-semibold text-muted" role="status">{t.addDevice.copied}</p>
			{/if}
		{:else}
			<p class="text-muted">{t.addDevice.copy}</p>
			<button class="{button.secondary} mt-5" type="button" disabled={adding.busy} onclick={show}>
				<Icon name="plus" class="size-4" />{t.addDevice.show}
			</button>
		{/if}
		{#if adding.error}
			<p class="{alert} mt-4" role="alert">{errorMessage(locale, adding.error)}</p>
		{/if}
	</div>
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
