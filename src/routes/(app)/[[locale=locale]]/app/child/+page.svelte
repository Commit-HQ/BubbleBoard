<script lang="ts">
	import { goto } from '$app/navigation';
	import CardSheet, { type PrintableCard } from '$lib/app/CardSheet.svelte';
	import ConfirmDialog from '$lib/app/ConfirmDialog.svelte';
	import FieldForm from '$lib/app/FieldForm.svelte';
	import Screen from '$lib/app/Screen.svelte';
	import { getApp } from '$lib/app/state.svelte';
	import { button, queryParam, surface } from '$lib/app/ui';
	import Icon from '$lib/components/Icon.svelte';
	import IconTile from '$lib/components/IconTile.svelte';
	import { listNames, messages } from '$lib/i18n';
	import { byId, namesOf, type Child, type Family } from '$lib/kindergarten';
	import { appPath } from '$lib/paths';
	import type { PageProps } from './$types';

	type Editing = 'addCard' | 'move' | { renameCard: string };
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
	let editing = $state<Editing>();
	let confirming = $state<Confirming>();
	let printed = $state.raw<PrintableCard[]>();

	/** The family's other children that this device can see. */
	function siblings(family: Family) {
		return app.catalog.children.filter(
			(other) => other.id !== child?.id && other.families.includes(family.id)
		);
	}

	/** The question to ask, and the change it confirms. */
	const dialog = $derived.by(() => {
		if (!confirming || !child) return undefined;
		const current = child;
		if (confirming.action === 'replaceCard') {
			const { family } = confirming;
			return {
				title: t.card.replaceTitle(family.name),
				copy: t.card.replaceCopy,
				confirm: t.card.replace,
				run: async () => {
					const [secret] = await app.replaceFamilyCards([family]);
					confirming = undefined;
					printFamilyCard(secret, family.name, family.classrooms);
				}
			};
		}
		if (confirming.action === 'removeCard') {
			const { family } = confirming;
			const others = siblings(family).map((other) => other.name);
			return {
				title: t.child.removeCardTitle(family.name),
				copy: others.length ? t.child.removeCardShared(others) : t.child.removeCardLast,
				confirm: t.actions.remove,
				danger: true,
				run: () => close(app.removeFamilyCard(current, family.id))
			};
		}
		// Family cards used only for this child stop working with it.
		const ending = families.filter((family) => !siblings(family).length);
		const back = classroom
			? appPath(data.locale, 'classroom', { id: classroom.id })
			: appPath(data.locale);
		return {
			title: t.child.removeTitle(current.name),
			copy: t.child.removeCopy(ending.map((family) => family.name)),
			confirm: t.child.remove,
			danger: true,
			run: async () => {
				await app.removeChild(current);
				await goto(back);
			}
		};
	});

	/** Closes the form or question once its change is saved. */
	async function close(change: Promise<unknown>) {
		await change;
		editing = undefined;
		confirming = undefined;
	}

	function printFamilyCard(secret: Uint8Array, name: string, classrooms: string[]) {
		const detail = listNames(data.locale, namesOf(app.catalog.classrooms, classrooms));
		printed = [{ secret, name, kind: 'family', detail }];
	}

	async function addCard(current: Child, name: string) {
		const secret = await app.addFamilyCard(current, name);
		editing = undefined;
		printFamilyCard(secret, name, [current.classroom]);
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
		rename={child && app.admin
			? { label: t.newChild.name, save: (name) => close(app.renameChild(child, name)) }
			: undefined}
	>
		{#if child}
			<section class="grid gap-3" aria-labelledby="cards-title">
				<h2 id="cards-title" class="text-2xl">{t.child.cards}</h2>
				<ul class="grid gap-3">
					{#each families as family (family.id)}
						{@const others = siblings(family)}
						{@const renaming = typeof editing === 'object' && editing.renameCard === family.id}
						<li class="rounded-3xl glass p-5">
							<div class="flex items-start gap-3">
								<IconTile icon="heart" />
								<div class="min-w-0">
									<div class="flex items-start gap-1">
										<p id="card-{family.id}" class="min-w-0 font-bold">{family.name}</p>
										{#if app.admin && !renaming}
											<button
												class="{button.icon} -my-2.5"
												type="button"
												aria-label={t.actions.rename}
												aria-describedby="card-{family.id}"
												onclick={() => (editing = { renameCard: family.id })}
											>
												<Icon name="pencil" class="size-4" />
											</button>
										{/if}
									</div>
									{#if others.length}
										<p class="text-sm text-muted">
											{t.child.also(
												others.map(
													(other) =>
														`${other.name} (${byId(app.catalog.classrooms, other.classroom).name})`
												)
											)}
										</p>
									{/if}
								</div>
							</div>
							{#if renaming}
								<div class="mt-4">
									<FieldForm
										locale={data.locale}
										label={t.child.cardName}
										value={family.name}
										submitLabel={t.actions.save}
										onsubmit={(name) => close(app.renameFamily(family, name))}
										oncancel={() => (editing = undefined)}
									/>
								</div>
							{:else}
								<div class="mt-4 flex flex-wrap gap-2">
									<button
										class={button.secondary}
										type="button"
										aria-describedby="card-{family.id}"
										onclick={() => (confirming = { action: 'replaceCard', family })}
									>
										<Icon name="refresh" class="size-4" />{t.card.replace}
									</button>
									{#if app.admin}
										<button
											class={button.danger}
											type="button"
											aria-describedby="card-{family.id}"
											onclick={() => (confirming = { action: 'removeCard', family })}
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
							<FieldForm
								locale={data.locale}
								label={t.newChild.cardName}
								hint={families.length ? t.child.addCardHint : undefined}
								submitLabel={families.length ? t.child.addCard : t.child.addFirstCard}
								onsubmit={(name) => addCard(child, name)}
								oncancel={() => (editing = undefined)}
							/>
						</div>
					{:else}
						<button
							class="{button.secondary} justify-self-start"
							type="button"
							onclick={() => (editing = 'addCard')}
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
							<button class={button.secondary} type="button" onclick={() => (editing = 'move')}>
								{t.child.move}
							</button>
						{/if}
						<button
							class={button.danger}
							type="button"
							onclick={() => (confirming = { action: 'removeChild' })}
						>
							<Icon name="trash" class="size-4" />{t.child.remove}
						</button>
					</div>
					{#if editing === 'move'}
						<div class={surface}>
							<FieldForm
								locale={data.locale}
								label={t.newChild.classroom}
								options={otherClassrooms.map((option) => ({
									value: option.id,
									label: option.name
								}))}
								submitLabel={t.child.moveSubmit}
								onsubmit={(target) => close(app.moveChild(child, target))}
								oncancel={() => (editing = undefined)}
							/>
						</div>
					{/if}
				</section>
			{/if}

			{#if dialog}
				<ConfirmDialog
					locale={data.locale}
					title={dialog.title}
					copy={dialog.copy}
					confirmLabel={dialog.confirm}
					danger={dialog.danger}
					onconfirm={dialog.run}
					onclose={() => (confirming = undefined)}
				/>
			{/if}
		{:else}
			<p class="text-muted">{t.notFound.copy}</p>
		{/if}
	</Screen>
{/if}
