<script lang="ts">
	import { goto } from '$app/navigation';
	import CardSheet, { type PrintableCard } from '$lib/app/CardSheet.svelte';
	import Panel from '$lib/app/Panel.svelte';
	import { getApp, Task, type NewKindergarten } from '$lib/app/state.svelte';
	import StatusView from '$lib/app/StatusView.svelte';
	import { alert, button, buttonRow, field, formText } from '$lib/app/ui';
	import { errorMessage, messages } from '$lib/i18n';
	import { createKindergarten } from '$lib/kindergarten';
	import { appPath } from '$lib/paths';
	import type { PageProps } from './$types';

	// The first setup (README). The app takes the setup link's token from the fragment when it starts; the
	// token can also be typed.
	let { data }: PageProps = $props();
	const app = getApp();
	const t = $derived(messages[data.locale].app);
	const task = new Task();
	/** Keys and cards are made once, so trying again sends the same setup. */
	let kindergarten = $state.raw<NewKindergarten>();
	let cards = $state.raw<PrintableCard[]>();

	async function submit(event: SubmitEvent & { currentTarget: EventTarget & HTMLFormElement }) {
		event.preventDefault();
		const form = new FormData(event.currentTarget);
		const token = app.setupToken ?? formText(form, 'token');
		const name = formText(form, 'name');
		await task.run(async () => {
			kindergarten ??= await createKindergarten(name);
			await app.setUp(token, kindergarten);
			cards = [
				{ secret: kindergarten.admin.secret, name: kindergarten.admin.name, kind: 'admin' },
				{ secret: kindergarten.recovery.secret, name: '', kind: 'recovery' }
			];
		});
		if (task.error === 'wrong-setup-token') app.setupToken = undefined;
	}
</script>

{#if cards}
	<CardSheet locale={data.locale} {cards} confirm ondone={() => goto(appPath(data.locale))} />
{:else if app.connected}
	<Panel icon="check" title={t.setup.connectedTitle} copy={t.setup.connectedCopy}>
		<div class={buttonRow}>
			<a class={button.primary} href={appPath(data.locale)}>{t.setup.open}</a>
		</div>
	</Panel>
{:else if app.status === 'loading' || app.status === 'unsupported'}
	<StatusView locale={data.locale} />
{:else}
	<Panel icon="key" title={t.setup.title} copy={t.setup.copy}>
		<form class="mt-8 grid gap-5" onsubmit={submit}>
			<label class={field.label}>
				<span class={field.name}>{t.setup.name}</span>
				<input
					class={field.input}
					name="name"
					required
					maxlength="80"
					autocomplete="name"
					readonly={kindergarten !== undefined}
				/>
				<span class={field.hint}>{t.setup.nameHint}</span>
			</label>
			{#if !app.setupToken}
				<label class={field.label}>
					<span class={field.name}>{t.setup.token}</span>
					<input
						class="{field.input} font-mono"
						name="token"
						required
						autocomplete="off"
						spellcheck="false"
					/>
					<span class={field.hint}>{t.setup.tokenHint}</span>
				</label>
			{/if}
			{#if task.error}<p class={alert} role="alert">{errorMessage(data.locale, task.error)}</p>{/if}
			{#if task.error === 'already-set-up'}
				<a class="{button.primary} justify-self-start" href={appPath(data.locale)}>
					{t.setup.connect}
				</a>
			{:else}
				<button class="{button.primary} justify-self-start" type="submit" disabled={task.busy}>
					{task.busy ? t.setup.creating : task.error ? t.offline.retry : t.setup.submit}
				</button>
			{/if}
		</form>
	</Panel>
{/if}
