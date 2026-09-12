<script lang="ts">
	import { readCard } from '$lib/card';
	import Icon from '$lib/components/Icon.svelte';
	import { errorMessage, messages, type Locale } from '$lib/i18n';
	import Panel from './Panel.svelte';
	import { readQrCode } from './scan';
	import Scanner from './Scanner.svelte';
	import { getApp } from './state.svelte';
	import { alert, button, buttonRow, field, formText } from './ui';

	// Connecting a device: scanning the card with the camera or from a photo, or typing its code. A phone's
	// own camera app opens the card's link instead, which the app reads on start.
	let { locale }: { locale: Locale } = $props();
	const app = getApp();
	const t = $derived(messages[locale].app);
	let open = $state<'scan' | 'code'>();
	let reading = $state(false);
	let codeInput = $state<HTMLInputElement>();

	// The code field opens when someone asks for it, so typing can start right away.
	$effect(() => {
		if (open === 'code') codeInput?.focus();
	});

	function toggle(choice: 'scan' | 'code') {
		open = open === choice ? undefined : choice;
	}

	/** Uses a scanned code. A QR code that isn't a card says why, and scanning goes on. */
	function read(text: string) {
		const card = readCard(text, location.origin);
		const found = !('error' in card);
		if (found) open = undefined;
		void app.useCard(card);
		return found;
	}

	async function readPhoto(photo: File) {
		reading = true;
		app.cardError = undefined;
		const text = await readQrCode(photo);
		reading = false;
		if (text === undefined) app.cardError = 'no-code';
		else read(text);
	}

	async function enter(event: SubmitEvent & { currentTarget: EventTarget & HTMLFormElement }) {
		event.preventDefault();
		const code = formText(new FormData(event.currentTarget), 'code');
		await app.useCard(readCard(code, location.origin));
	}
</script>

<Panel icon="key" title={t.connect.title} copy={t.connect.copy}>
	{#if app.notice}
		<p class="mt-6 rounded-2xl bg-apricot/15 px-4 py-3 font-semibold" role="status">
			{errorMessage(locale, app.notice)}
		</p>
	{/if}

	<div class={buttonRow}>
		<button
			class={button.primary}
			type="button"
			aria-expanded={open === 'scan'}
			onclick={() => toggle('scan')}
		>
			<Icon name="camera" class="size-4" />{t.connect.scan}
		</button>
		<button
			class={button.secondary}
			type="button"
			aria-expanded={open === 'code'}
			onclick={() => toggle('code')}
		>
			<Icon name="key" class="size-4" />{t.connect.enter}
		</button>
	</div>

	{#if open === 'scan'}
		<Scanner {locale} disabled={reading || app.connecting} onread={read} onphoto={readPhoto} />
	{:else if open === 'code'}
		<form class="mt-6 grid gap-3" onsubmit={enter}>
			<label class={field.label}>
				<span class={field.name}>{t.connect.code}</span>
				<input
					bind:this={codeInput}
					class="{field.input} font-mono tracking-wider uppercase"
					name="code"
					required
					autocomplete="off"
					autocapitalize="characters"
					spellcheck="false"
				/>
				<span class={field.hint}>{t.connect.codeHint}</span>
			</label>
			<button class="{button.primary} justify-self-start" type="submit" disabled={app.connecting}>
				{t.connect.submit}
			</button>
		</form>
	{/if}

	<p class="mt-5 min-h-6 font-semibold text-muted" aria-live="polite">
		{reading ? t.connect.scanning : app.connecting ? t.connect.connecting : ''}
	</p>
	{#if app.cardError}
		<p class={alert} role="alert">{errorMessage(locale, app.cardError)}</p>
	{/if}
</Panel>
