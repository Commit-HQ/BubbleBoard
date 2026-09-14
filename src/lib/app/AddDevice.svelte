<script lang="ts">
	import { page } from '$app/state';
	import { cardLink, formatCardCode } from '$lib/card';
	import Icon from '$lib/components/Icon.svelte';
	import IconTile from '$lib/components/IconTile.svelte';
	import { errorMessage, formatDateTime, messages, type Locale } from '$lib/i18n';
	import { appPath } from '$lib/paths';
	import QrCode from './QrCode.svelte';
	import { getApp, Task } from './state.svelte';
	import { alert, button, surface } from './ui';

	// Adding another of a family's devices, such as grandparents' phones, without the printed QR code: this device
	// shows a one-time card, which connects one device within a day, to scan or to send as a link. Like a new
	// printed card's, its code is kept only while it shows (docs/access-format.md).
	let { locale }: { locale: Locale } = $props();
	const app = getApp();
	const t = $derived(messages[locale].app);
	const task = new Task();
	/** Where the code can be typed, as a printed card says. */
	const address = $derived(`${page.url.host}${appPath(locale)}`);
	/** Where the browser can't share a link, it's copied instead. */
	const canShare = 'share' in navigator;
	let shown = $state.raw<{ secret: Uint8Array<ArrayBuffer>; until: number }>();
	let copied = $state(false);
	let description = $state<HTMLParagraphElement>();

	// The code takes the place of the button that asked for it, so focus moves to what it says.
	$effect(() => {
		if (shown) description?.focus();
	});

	function show() {
		return task.run(async () => {
			shown = await app.addDevice();
			copied = false;
		});
	}

	function share(link: string, until: string) {
		return task.run(async () => {
			if (!canShare) {
				await navigator.clipboard.writeText(link);
				copied = true;
				return;
			}
			try {
				await navigator.share({ text: t.addDevice.shareText(until), url: link });
			} catch (cause) {
				// Closing the share sheet shares nothing, as it should.
				if (!(cause instanceof DOMException && cause.name === 'AbortError')) throw cause;
			}
		});
	}
</script>

<section class={surface} aria-labelledby="add-device-title">
	<IconTile icon="users" tone="ink" />
	<h2 id="add-device-title" class="mt-5 text-3xl">{t.addDevice.title}</h2>
	{#if !app.canAddDevices}
		<p class="mt-1 text-muted">{t.addDevice.connectAgain}</p>
	{:else if shown}
		{@const link = cardLink(page.url.origin, locale, shown.secret)}
		{@const until = formatDateTime(locale, shown.until)}
		<p class="mt-1 text-muted focus:outline-none" tabindex="-1" bind:this={description}>
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
				disabled={task.busy}
				onclick={() => share(link, until)}
			>
				<Icon name={canShare ? 'share' : 'link'} class="size-4" />
				{canShare ? t.addDevice.share : t.addDevice.copyLink}
			</button>
			<button class={button.secondary} type="button" onclick={() => (shown = undefined)}>
				{t.actions.done}
			</button>
		</div>
		{#if copied}
			<p class="mt-3 font-semibold text-muted" role="status">{t.addDevice.copied}</p>
		{/if}
	{:else}
		<p class="mt-1 text-muted">{t.addDevice.copy}</p>
		<button class="{button.secondary} mt-7" type="button" disabled={task.busy} onclick={show}>
			<Icon name="plus" class="size-4" />{t.addDevice.show}
		</button>
	{/if}
	{#if task.error}
		<p class="{alert} mt-4" role="alert">{errorMessage(locale, task.error)}</p>
	{/if}
</section>
