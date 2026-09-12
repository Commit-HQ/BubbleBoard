<script lang="ts">
	import { goto } from '$app/navigation';
	import CardSheet, { type PrintableCard } from '$lib/app/CardSheet.svelte';
	import ConfirmDialog from '$lib/app/ConfirmDialog.svelte';
	import NameForm from '$lib/app/NameForm.svelte';
	import Screen from '$lib/app/Screen.svelte';
	import { getApp, Task } from '$lib/app/state.svelte';
	import { alert, button, field, formText, queryParam, surface } from '$lib/app/ui';
	import Icon from '$lib/components/Icon.svelte';
	import { errorMessage, listNames, messages } from '$lib/i18n';
	import type { Family } from '$lib/kindergarten';
	import { appPath } from '$lib/paths';
	import type { PageProps } from './$types';

	type Editing = 'addCard' | 'rename' | 'move' | { renameCard: string };
	type Confirming =
		{ action: 'replaceCard' | 'removeCard'; family: Family } | { action: 'removeChild' };

	let { data }: PageProps = $props();
	const app = getApp();
	const t = $derived(messages[data.locale].app);
	const id = $derived(queryParam('id'));
	const child = $derived(app.catalog.children.find((candidate) => candidate.id === id));
	const classroom = $derived(
		app.catalog.classrooms.find((candidate) => candidate.id === child?.classroom)
	);
	const families = $derived(
		app.catalog.families.filter((family) => child?.families.includes(family.id))
	);
	const otherClassrooms = $derived(
		app.catalog.classrooms.filter((candidate) => candidate.id !== child?.classroom)
	);
	const task = new Task(app);
	const error = $derived(task.error && errorMessage(data.locale, task.error));
	let editing = $state<Editing>();
	let confirming = $state<Confirming>();
	let printed = $state.raw<PrintableCard[]>();

	/** The family's other children that this device can see. */
	function siblings(family: Family) {
		return app.catalog.children.filter(
			(other) => other.id !== child?.id && other.families.includes(family.id)
		);
	}

	const dialog = $derived.by(() => {
		if (!confirming || !child) return undefined;
		if (confirming.action === 'replaceCard') {
			const { name } = confirming.family;
			return {
				title: t.card.replaceTitle(name),
				copy: t.card.replaceCopy,
				confirm: t.card.replace
			};
		}
		if (confirming.action === 'removeCard') {
			const others = siblings(confirming.family).map((other) => other.name);
			return {
				title: t.child.removeCardTitle(confirming.family.name),
				copy: others.length ? t.child.removeCardShared(others) : t.child.removeCardLast,
				confirm: t.actions.remove,
				danger: true
			};
		}
		// Family cards used only for this child stop working with it.
		const ending = families.filter((family) => !siblings(family).length);
		return {
			title: t.child.removeTitle(child.name),
			copy: t.child.removeCopy(ending.map((family) => family.name)),
			confirm: t.child.remove,
			danger: true
		};
	});

	function edit(next?: Editing) {
		task.reset();
		editing = next;
	}

	function ask(next?: Confirming) {
		task.reset();
		confirming = next;
	}

	/** Runs a change and closes whatever form or question started it. */
	async function change(work: () => Promise<unknown>) {
		const done = await task.run(work);
		if (done) {
			editing = undefined;
			confirming = undefined;
		}
		return done;
	}

	function printFamilyCard(secret: Uint8Array, name: string, classrooms: string[]) {
		const detail = listNames(data.locale, app.classroomNames(classrooms));
		printed = [{ secret, name, kind: 'family', detail }];
	}

	function addCard(name: string) {
		const current = child;
		if (!current) return;
		change(async () => {
			printFamilyCard(await app.addFamilyCard(current, name), name, [current.classroom]);
		});
	}

	async function confirm() {
		const current = child;
		const action = confirming;
		if (!current || !action) return;
		if (action.action === 'replaceCard') {
			await change(async () => {
				const secret = await app.replaceFamilyCard(action.family);
				printFamilyCard(secret, action.family.name, action.family.classrooms);
			});
		} else if (action.action === 'removeCard') {
			await change(() => app.removeFamilyCard(current, action.family.id));
		} else {
			const back = classroom
				? appPath(data.locale, 'classroom', { id: classroom.id })
				: appPath(data.locale);
			if (await change(() => app.removeChild(current))) await goto(back);
		}
	}

	function renameChild(name: string) {
		const current = child;
		if (current) change(() => app.renameChild(current, name));
	}

	function move(event: SubmitEvent & { currentTarget: EventTarget & HTMLFormElement }) {
		event.preventDefault();
		const current = child;
		const target = formText(new FormData(event.currentTarget), 'classroom');
		if (current && target) change(() => app.moveChild(current, target));
	}
</script>

{#if printed}
	<CardSheet locale={data.locale} cards={printed} ondone={() => (printed = undefined)} />
{:else}
	<Screen
		locale={data.locale}
		title={child?.name ?? t.notFound.title}
		back={classroom && {
			href: appPath(data.locale, 'classroom', { id: classroom.id }),
			label: classroom.name
		}}
	>
		{#if child}
			<section class="grid gap-3" aria-labelledby="cards-title">
				<h2 id="cards-title" class="text-2xl">{t.child.cards}</h2>
				<ul class="grid gap-3">
					{#each families as family (family.id)}
						{@const others = siblings(family)}
						<li class="rounded-3xl glass p-5">
							<div class="flex items-start gap-3">
								<span
									class="grid size-10 shrink-0 place-items-center rounded-2xl bg-sunrise text-white"
								>
									<Icon name="heart" class="size-5" />
								</span>
								<div class="min-w-0">
									<p id="card-{family.id}" class="font-bold">{family.name}</p>
									{#if others.length}
										<p class="text-sm text-muted">
											{t.child.also(
												others.map(
													(other) => `${other.name} (${app.classroomNames([other.classroom])[0]})`
												)
											)}
										</p>
									{/if}
								</div>
							</div>
							{#if typeof editing === 'object' && editing.renameCard === family.id}
								<div class="mt-4">
									<NameForm
										label={t.child.cardName}
										value={family.name}
										submitLabel={t.actions.save}
										cancelLabel={t.actions.cancel}
										busy={task.busy}
										{error}
										onsubmit={(name) => change(() => app.renameFamily(family, name))}
										oncancel={() => edit()}
									/>
								</div>
							{:else}
								<div class="mt-4 flex flex-wrap gap-2">
									<button
										class={button.secondary}
										type="button"
										aria-describedby="card-{family.id}"
										onclick={() => ask({ action: 'replaceCard', family })}
									>
										<Icon name="refresh" class="size-4" />{t.card.replace}
									</button>
									{#if app.admin}
										<button
											class={button.quiet}
											type="button"
											aria-describedby="card-{family.id}"
											onclick={() => edit({ renameCard: family.id })}
										>
											<Icon name="pencil" class="size-4" />{t.actions.rename}
										</button>
										<button
											class={button.danger}
											type="button"
											aria-describedby="card-{family.id}"
											onclick={() => ask({ action: 'removeCard', family })}
										>
											<Icon name="trash" class="size-4" />{t.actions.remove}
										</button>
									{/if}
								</div>
							{/if}
						</li>
					{:else}
						<li class="text-muted">{t.child.noCards}</li>
					{/each}
				</ul>
				{#if app.admin}
					{#if editing === 'addCard'}
						<div class={surface}>
							<NameForm
								label={t.newChild.cardName}
								hint={families.length ? t.child.addCardHint : undefined}
								submitLabel={families.length ? t.child.addCard : t.child.addFirstCard}
								cancelLabel={t.actions.cancel}
								busy={task.busy}
								{error}
								onsubmit={addCard}
								oncancel={() => edit()}
							/>
						</div>
					{:else}
						<button
							class="{button.secondary} justify-self-start"
							type="button"
							onclick={() => edit('addCard')}
						>
							<Icon name="plus" class="size-4" />{families.length
								? t.child.addCard
								: t.child.addFirstCard}
						</button>
					{/if}
				{/if}
			</section>

			{#if app.admin}
				<section class="grid gap-4 border-t border-ink/10 pt-6">
					<div class="flex flex-wrap gap-2">
						{#if otherClassrooms.length}
							<button class={button.secondary} type="button" onclick={() => edit('move')}>
								{t.child.move}
							</button>
						{/if}
						<button class={button.quiet} type="button" onclick={() => edit('rename')}>
							<Icon name="pencil" class="size-4" />{t.child.rename}
						</button>
						<button
							class={button.danger}
							type="button"
							onclick={() => ask({ action: 'removeChild' })}
						>
							<Icon name="trash" class="size-4" />{t.child.remove}
						</button>
					</div>
					{#if editing === 'rename'}
						<div class={surface}>
							<NameForm
								label={t.newChild.name}
								value={child.name}
								submitLabel={t.actions.save}
								cancelLabel={t.actions.cancel}
								busy={task.busy}
								{error}
								onsubmit={renameChild}
								oncancel={() => edit()}
							/>
						</div>
					{:else if editing === 'move'}
						<form class="{surface} grid gap-3" onsubmit={move}>
							<label class={field.label}>
								<span class={field.name}>{t.newChild.classroom}</span>
								<select class={field.input} name="classroom">
									{#each otherClassrooms as option (option.id)}
										<option value={option.id}>{option.name}</option>
									{/each}
								</select>
							</label>
							{#if error}<p class={alert} role="alert">{error}</p>{/if}
							<div class="flex flex-wrap gap-2">
								<button class={button.primary} type="submit" disabled={task.busy}>
									{t.child.moveSubmit}
								</button>
								<button class={button.quiet} type="button" onclick={() => edit()}>
									{t.actions.cancel}
								</button>
							</div>
						</form>
					{/if}
				</section>
			{/if}

			{#if dialog}
				<ConfirmDialog
					title={dialog.title}
					copy={dialog.copy}
					confirmLabel={dialog.confirm}
					cancelLabel={t.actions.cancel}
					busyLabel={t.actions.working}
					danger={dialog.danger}
					busy={task.busy}
					{error}
					onconfirm={confirm}
					onclose={() => ask()}
				/>
			{/if}
		{:else}
			<p class="text-muted">{t.notFound.copy}</p>
		{/if}
	</Screen>
{/if}
