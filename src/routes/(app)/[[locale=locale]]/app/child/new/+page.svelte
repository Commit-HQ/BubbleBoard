<script lang="ts">
	import { goto } from '$app/navigation';
	import CardSheet, { type PrintableCard } from '$lib/app/CardSheet.svelte';
	import Screen from '$lib/app/Screen.svelte';
	import { getApp, Task, type ChildValues } from '$lib/app/state.svelte';
	import { alert, button, field, formText, queryParam } from '$lib/app/ui';
	import { errorMessage, messages } from '$lib/i18n';
	import { appPath } from '$lib/paths';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const app = getApp();
	const t = $derived(messages[data.locale].app);
	const preset = $derived(queryParam('classroom'));
	const presetClassroom = $derived(app.catalog.classrooms.find(({ id }) => id === preset));
	const task = new Task(app);
	let cardFor = $state<'new' | 'sibling'>('new');
	let printed = $state.raw<{ child: string; cards: PrintableCard[] }>();

	async function submit(event: SubmitEvent & { currentTarget: EventTarget & HTMLFormElement }) {
		event.preventDefault();
		const form = new FormData(event.currentTarget);
		const child = { name: formText(form, 'name'), classroom: formText(form, 'classroom') };
		const values: ChildValues =
			cardFor === 'new'
				? { ...child, cardName: formText(form, 'cardName') }
				: { ...child, sibling: formText(form, 'sibling') };
		await task.run(async () => {
			const added = await app.addChild(values);
			if (!added.secret || !('cardName' in values)) {
				await goto(appPath(data.locale, 'child', { id: added.id }));
				return;
			}
			const detail = app.classroomNames([values.classroom])[0];
			const card = { secret: added.secret, name: values.cardName, kind: 'family' as const, detail };
			printed = { child: added.id, cards: [card] };
		});
	}
</script>

{#if printed}
	{@const child = printed.child}
	<CardSheet
		locale={data.locale}
		cards={printed.cards}
		ondone={() => goto(appPath(data.locale, 'child', { id: child }))}
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
			<form class="grid gap-6 rounded-4xl glass p-6 sm:p-8" onsubmit={submit}>
				<label class={field.label}>
					<span class={field.name}>{t.newChild.name}</span>
					<input class={field.input} name="name" required maxlength="80" autocomplete="off" />
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
											{sibling.name} ({app.classroomNames([sibling.classroom])[0]})
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
				<button class="{button.primary} justify-self-start" type="submit" disabled={task.busy}>
					{task.busy ? t.actions.working : t.newChild.submit}
				</button>
			</form>
		{:else}
			<p class="text-muted">{t.home.emptyAdmin}</p>
		{/if}
	</Screen>
{/if}
