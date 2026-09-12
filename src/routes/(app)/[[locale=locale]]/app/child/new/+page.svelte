<script lang="ts">
	import { beforeNavigate, goto } from '$app/navigation';
	import CardSheet, { type PrintableCard } from '$lib/app/CardSheet.svelte';
	import ConfirmDialog from '$lib/app/ConfirmDialog.svelte';
	import Screen from '$lib/app/Screen.svelte';
	import { getApp, Task, type ChildValues } from '$lib/app/state.svelte';
	import { alert, button, field, formText, queryParam, surface } from '$lib/app/ui';
	import Icon from '$lib/components/Icon.svelte';
	import { errorMessage, messages } from '$lib/i18n';
	import { byId } from '$lib/kindergarten';
	import { appPath } from '$lib/paths';
	import type { PageProps } from './$types';

	// Children are often added a classroom at a time: the form stays for the next child, and each new family
	// card waits on this page to be printed with the others. Its code exists nowhere else, so leaving
	// before printing asks first; cards left unprinted can be replaced from the classroom.
	let { data }: PageProps = $props();
	const app = getApp();
	const t = $derived(messages[data.locale].app);
	const preset = $derived(queryParam('classroom'));
	const presetClassroom = $derived(app.catalog.classrooms.find(({ id }) => id === preset));
	const task = new Task();
	let cardFor = $state<'new' | 'sibling'>('new');
	/** The child added last, to confirm it. */
	let added = $state<string>();
	let unprinted = $state.raw<(PrintableCard & { child: string })[]>([]);
	let printing = $state(false);
	/** Where someone was going when asked whether to leave cards unprinted. */
	let leaving = $state<URL>();
	let leaveAnyway = false;
	let nameInput = $state<HTMLInputElement>();
	let cardNameInput = $state<HTMLInputElement>();

	beforeNavigate((navigation) => {
		if (!unprinted.length || leaveAnyway) return;
		navigation.cancel();
		// Closing the tab or leaving the site gets the browser's own question instead.
		if (!navigation.willUnload && navigation.to) leaving = navigation.to.url;
	});

	async function leave() {
		if (!leaving) return;
		leaveAnyway = true;
		await goto(leaving);
	}

	async function submit(event: SubmitEvent & { currentTarget: EventTarget & HTMLFormElement }) {
		event.preventDefault();
		const form = new FormData(event.currentTarget);
		const child = { name: formText(form, 'name'), classroom: formText(form, 'classroom') };
		const values: ChildValues =
			cardFor === 'new'
				? { ...child, cardName: formText(form, 'cardName') }
				: { ...child, sibling: formText(form, 'sibling') };
		added = undefined;
		await task.run(async () => {
			const secret = await app.addChild(values);
			if (secret && 'cardName' in values) {
				const detail = byId(app.catalog.classrooms, values.classroom).name;
				const card = { secret, name: values.cardName, kind: 'family' as const, detail };
				unprinted = [...unprinted, { ...card, child: values.name }];
			}
			added = values.name;
			// The next child is usually in the same classroom, so only the names start over.
			if (nameInput) nameInput.value = '';
			if (cardNameInput) cardNameInput.value = '';
			nameInput?.focus();
		});
	}
</script>

{#if printing}
	<CardSheet
		locale={data.locale}
		cards={unprinted}
		ondone={() => {
			unprinted = [];
			printing = false;
		}}
	/>
{:else}
	<Screen
		locale={data.locale}
		title={t.newChild.title}
		need="admin"
		back={presetClassroom && {
			href: appPath(data.locale, 'classroom', { id: presetClassroom.id }),
			label: presetClassroom.name
		}}
	>
		{#if app.catalog.classrooms.length}
			<form class="{surface} grid gap-6" onsubmit={submit}>
				<label class={field.label}>
					<span class={field.name}>{t.newChild.name}</span>
					<input
						bind:this={nameInput}
						class={field.input}
						name="name"
						required
						maxlength="80"
						autocomplete="off"
					/>
				</label>
				<label class={field.label}>
					<span class={field.name}>{t.newChild.classroom}</span>
					<select class={field.input} name="classroom">
						{#each app.catalog.classrooms as classroom (classroom.id)}
							<option value={classroom.id} selected={classroom.id === preset}>
								{classroom.name}
							</option>
						{/each}
					</select>
				</label>
				<fieldset class="grid gap-3">
					<legend class="mb-2 font-semibold">{t.newChild.cards}</legend>
					<label class="flex items-center gap-3">
						<input
							class={field.check}
							type="radio"
							name="cardFor"
							value="new"
							bind:group={cardFor}
						/>
						{t.newChild.newCard}
					</label>
					{#if cardFor === 'new'}
						<label class="{field.label} sm:ml-8">
							<span class={field.name}>{t.newChild.cardName}</span>
							<input
								bind:this={cardNameInput}
								class={field.input}
								name="cardName"
								required
								maxlength="80"
								autocomplete="off"
							/>
							<span class={field.hint}>{t.newChild.cardNameHint}</span>
						</label>
					{/if}
					{#if app.catalog.children.length}
						<label class="flex items-center gap-3">
							<input
								class={field.check}
								type="radio"
								name="cardFor"
								value="sibling"
								bind:group={cardFor}
							/>
							{t.newChild.sibling}
						</label>
						{#if cardFor === 'sibling'}
							<label class="{field.label} sm:ml-8">
								<span class={field.name}>{t.newChild.siblingName}</span>
								<select class={field.input} name="sibling" required>
									{#each app.catalog.children as sibling (sibling.id)}
										<option value={sibling.id}>
											{sibling.name} ({byId(app.catalog.classrooms, sibling.classroom).name})
										</option>
									{/each}
								</select>
							</label>
						{/if}
					{/if}
				</fieldset>
				{#if task.error}
					<p class={alert} role="alert">{errorMessage(data.locale, task.error)}</p>
				{/if}
				<div class="flex flex-wrap items-center gap-x-5 gap-y-3">
					<button class={button.primary} type="submit" disabled={task.busy}>
						{task.busy ? t.actions.working : t.newChild.submit}
					</button>
					<p class="font-semibold text-muted" role="status">
						{added ? t.newChild.added(added) : ''}
					</p>
				</div>
			</form>

			{#if unprinted.length}
				<section class="{surface} grid justify-items-start gap-4" aria-labelledby="to-print">
					<div>
						<h2 id="to-print" class="text-2xl">{t.newChild.toPrint(unprinted.length)}</h2>
						<p class="mt-1 text-muted">{t.newChild.toPrintCopy}</p>
					</div>
					<ul class="grid gap-1">
						{#each unprinted as card (card.secret)}
							<li>
								<span class="font-semibold">{card.name}</span>
								<span class="text-muted">· {card.child}</span>
							</li>
						{/each}
					</ul>
					<button class={button.primary} type="button" onclick={() => (printing = true)}>
						<Icon name="printer" class="size-4" />{t.newChild.print(unprinted.length)}
					</button>
				</section>
			{/if}
		{:else}
			<p class="text-muted">{t.home.emptyAdmin}</p>
		{/if}
	</Screen>
{/if}

{#if leaving}
	<ConfirmDialog
		locale={data.locale}
		title={t.newChild.leaveTitle}
		copy={t.newChild.leaveCopy}
		confirmLabel={t.newChild.leave}
		cancelLabel={t.newChild.stay}
		safe
		onconfirm={leave}
		onclose={() => (leaving = undefined)}
	/>
{/if}
