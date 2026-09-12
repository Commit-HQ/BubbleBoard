<script lang="ts">
	import { afterNavigate, goto, replaceState } from '$app/navigation';
	import { page } from '$app/state';
	import CardSheet, { type PrintableCard } from '$lib/app/CardSheet.svelte';
	import Panel from '$lib/app/Panel.svelte';
	import { getApp, Task, type NewKindergarten } from '$lib/app/state.svelte';
	import StatusView from '$lib/app/StatusView.svelte';
	import { alert, button, field, formText } from '$lib/app/ui';
	import bubble from '$lib/assets/bubble.svg';
	import Icon from '$lib/components/Icon.svelte';
	import { errorMessage, messages } from '$lib/i18n';
	import { createKindergarten } from '$lib/kindergarten';
	import { appPath } from '$lib/paths';
	import { tick } from 'svelte';
	import type { PageProps } from './$types';

	// The first setup (README). The setup link carries its token in the fragment; it can also be typed.
	let { data }: PageProps = $props();
	const app = getApp();
	const t = $derived(messages[data.locale].app);
	const task = new Task(app);
	let linkToken = $state<string>();
	/** Keys and cards are made once, so trying again sends the same setup. */
	let kindergarten = $state.raw<NewKindergarten>();
	let cards = $state.raw<PrintableCard[]>();

	// The token moves from the address bar into this page once the router is ready, a tick after the
	// navigation's callbacks (see the app layout).
	afterNavigate(async () => {
		const token = new URLSearchParams(location.hash.slice(1)).get('token');
		if (!token) return;
		linkToken = token;
		await tick();
		replaceState(location.pathname, page.state);
	});

	async function submit(event: SubmitEvent & { currentTarget: EventTarget & HTMLFormElement }) {
		event.preventDefault();
		const form = new FormData(event.currentTarget);
		const token = linkToken ?? formText(form, 'token');
		const name = formText(form, 'name');
		const done = await task.run(async () => {
			kindergarten ??= await createKindergarten(name);
			await app.setUp(token, kindergarten);
			cards = [
				{ secret: kindergarten.admin.secret, name: kindergarten.admin.name, kind: 'admin' },
				{ secret: kindergarten.recovery.secret, kind: 'recovery' }
			];
		});
		if (!done && task.error === 'wrong-setup-token') linkToken = undefined;
	}
</script>

{#if cards}
	<CardSheet locale={data.locale} {cards} confirm ondone={() => goto(appPath(data.locale))} />
{:else if app.status === 'staff' || app.status === 'family'}
	<Panel icon="check" title={t.setup.connectedTitle} copy={t.setup.connectedCopy}>
		<a class={button.primary} href={appPath(data.locale)}>{t.setup.open}</a>
	</Panel>
{:else if app.status === 'loading' || app.status === 'unsupported'}
	<StatusView locale={data.locale} />
{:else}
	<section class="relative isolate my-auto overflow-hidden rounded-4xl glass p-7 sm:p-10">
		<img
			src={bubble}
			alt=""
			class="pointer-events-none absolute -top-14 -right-14 -z-10 size-44 sm:size-56"
		/>
		<img src={bubble} alt="" class="pointer-events-none absolute top-28 right-8 -z-10 size-10" />
		<span class="grid size-11 place-items-center rounded-2xl bg-sunrise text-white">
			<Icon name="key" />
		</span>
		<h1 class="mt-5 max-w-sm text-4xl sm:text-5xl">{t.setup.title}</h1>
		<p class="mt-3 max-w-md text-lg text-muted">{t.setup.copy}</p>
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
			{#if !linkToken}
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
	</section>
{/if}
