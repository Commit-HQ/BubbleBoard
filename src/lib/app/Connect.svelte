<script lang="ts">
	import { readCard } from '$lib/card';
	import Icon from '$lib/components/Icon.svelte';
	import { errorMessage, messages, type Locale } from '$lib/i18n';
	import Panel from './Panel.svelte';
	import { readQrCode } from './scan';
	import Scanner from './Scanner.svelte';
	import { getApp } from './state.svelte';
	import { alert, button, field, filePicker, formText } from './ui';

	// Connecting a device: scanning the card with the camera, typing its code, or choosing a photo of it. A
	// phone's own camera app opens the card's link instead, which the app reads on start.
	let { locale }: { locale: Locale } = $props();
	const app = getApp();
	const t = $derived(messages[locale].app.connect);
	let scanning = $state(false);
	let typing = $state(false);
	let reading = $state(false);
	let codeInput = $state<HTMLInputElement>();

	// The code field opens when someone asks for it, so typing can start right away.
	$effect(() => {
		if (typing) codeInput?.focus();
	});

	function scan() {
		app.cardError = undefined;
		scanning = true;
	}

	/** Uses a code read from the camera or a photo. A QR code that isn't a card says why, and scanning goes on. */
	function read(text: string) {
		const card = readCard(text, location.origin);
		const found = !('error' in card);
		if (found) scanning = false;
		void app.useCard(card);
		return found;
	}

	async function choose(event: Event & { currentTarget: EventTarget & HTMLInputElement }) {
		const input = event.currentTarget;
		const [photo] = input.files ?? [];
		input.value = '';
		if (!photo) return;
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

<Panel icon="key" title={t.title} copy={t.copy}>
	{#if app.notice}
		<p class="mt-6 rounded-2xl bg-apricot/15 px-4 py-3 font-semibold" role="status">
			{errorMessage(locale, app.notice)}
		</p>
	{/if}

	<!-- One under another on a phone, so the three ways to connect line up. -->
	<div class="mt-8 grid gap-3 sm:flex sm:flex-wrap">
		<button class={button.primary} type="button" aria-haspopup="dialog" onclick={scan}>
			<Icon name="camera" class="size-4" />{t.scan}
		</button>
		<button
			class={button.secondary}
			type="button"
			aria-expanded={typing}
			onclick={() => (typing = !typing)}
		>
			<Icon name="key" class="size-4" />{t.enter}
		</button>
		<label class="{button.secondary} {filePicker}">
			<Icon name="image" class="size-4" />{t.photo}
			<input
				class="sr-only"
				type="file"
				accept="image/*"
				disabled={reading || app.connecting}
				onchange={choose}
			/>
		</label>
	</div>

	{#if typing}
		<form class="mt-6 grid gap-3" onsubmit={enter}>
			<label class={field.label}>
				<span class={field.name}>{t.code}</span>
				<input
					bind:this={codeInput}
					class="{field.input} font-mono tracking-wider uppercase"
					name="code"
					required
					autocomplete="off"
					autocapitalize="characters"
					spellcheck="false"
				/>
				<span class={field.hint}>{t.codeHint}</span>
			</label>
			<button class="{button.primary} justify-self-start" type="submit" disabled={app.connecting}>
				{t.submit}
			</button>
		</form>
	{/if}

	<p class="mt-5 min-h-6 font-semibold text-muted" aria-live="polite">
		{reading ? t.scanning : app.connecting ? t.connecting : ''}
	</p>
	<!-- While the scanner is open, it shows the error itself. -->
	{#if app.cardError && !scanning}
		<p class={alert} role="alert">{errorMessage(locale, app.cardError)}</p>
	{/if}
</Panel>

{#if scanning}
	<Scanner {locale} error={app.cardError} onread={read} onclose={() => (scanning = false)} />
{/if}
