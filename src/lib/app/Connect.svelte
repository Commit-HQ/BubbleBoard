<script lang="ts">
	import { readCard } from '$lib/card';
	import Icon from '$lib/components/Icon.svelte';
	import { errorMessage, messages, type Locale } from '$lib/i18n';
	import Panel from './Panel.svelte';
	import { readQrCode } from './scan';
	import { getApp } from './state.svelte';
	import { alert, button, buttonRow, field, formText } from './ui';

	// Connecting a device: a photo of the card (on a phone, the camera opens from here), or its typed code.
	// A phone's own camera app opens the card's link instead, which the app reads on start.
	let { locale }: { locale: Locale } = $props();
	const app = getApp();
	const t = $derived(messages[locale].app);
	let entering = $state(false);
	let scanning = $state(false);
	let codeInput = $state<HTMLInputElement>();

	// The code field opens when someone asks for it, so typing can start right away.
	$effect(() => {
		if (entering) codeInput?.focus();
	});

	async function scan(event: Event & { currentTarget: EventTarget & HTMLInputElement }) {
		const input = event.currentTarget;
		const [photo] = input.files ?? [];
		input.value = '';
		if (!photo) return;
		scanning = true;
		app.cardError = undefined;
		const text = await readQrCode(photo);
		scanning = false;
		if (text === undefined) app.cardError = 'no-code';
		else await app.useCard(readCard(text, location.origin));
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
		<label
			class="{button.primary} cursor-pointer has-focus-visible:outline-3 has-focus-visible:outline-offset-4 has-focus-visible:outline-accent"
		>
			<Icon name="camera" class="size-4" />{t.connect.scan}
			<input
				class="sr-only"
				type="file"
				accept="image/*"
				disabled={scanning || app.connecting}
				onchange={scan}
			/>
		</label>
		<button
			class={button.secondary}
			type="button"
			aria-expanded={entering}
			onclick={() => (entering = !entering)}
		>
			<Icon name="key" class="size-4" />{t.connect.enter}
		</button>
	</div>

	{#if entering}
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
		{scanning ? t.connect.scanning : app.connecting ? t.connect.connecting : ''}
	</p>
	{#if app.cardError}
		<p class={alert} role="alert">{errorMessage(locale, app.cardError)}</p>
	{/if}
</Panel>
