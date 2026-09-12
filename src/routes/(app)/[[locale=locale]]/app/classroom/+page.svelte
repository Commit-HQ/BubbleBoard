<script lang="ts">
	import { goto } from '$app/navigation';
	import ConfirmDialog from '$lib/app/ConfirmDialog.svelte';
	import ListLink from '$lib/app/ListLink.svelte';
	import NameForm from '$lib/app/NameForm.svelte';
	import Screen from '$lib/app/Screen.svelte';
	import { getApp, Task } from '$lib/app/state.svelte';
	import { button, queryParam, surface } from '$lib/app/ui';
	import Icon from '$lib/components/Icon.svelte';
	import { errorMessage, listNames, messages } from '$lib/i18n';
	import { appPath } from '$lib/paths';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const app = getApp();
	const t = $derived(messages[data.locale].app);
	const id = $derived(queryParam('id'));
	const classroom = $derived(app.catalog.classrooms.find((candidate) => candidate.id === id));
	const children = $derived(app.catalog.children.filter((child) => child.classroom === id));
	const teachers = $derived(
		app.catalog.teachers.filter((teacher) => classroom && teacher.classrooms.includes(classroom.id))
	);
	const task = new Task(app);
	const error = $derived(task.error && errorMessage(data.locale, task.error));
	let renaming = $state(false);
	let deleting = $state(false);

	function cardNames(families: string[]) {
		const names = app.catalog.families
			.filter((family) => families.includes(family.id))
			.map((family) => family.name);
		return listNames(data.locale, names);
	}

	function open(form: 'rename' | 'delete', value: boolean) {
		task.reset();
		if (form === 'rename') renaming = value;
		else deleting = value;
	}

	async function rename(name: string) {
		const current = classroom;
		if (current && (await task.run(() => app.renameClassroom(current.id, name)))) renaming = false;
	}

	async function remove() {
		const current = classroom;
		if (current && (await task.run(() => app.deleteClassroom(current.id)))) {
			await goto(appPath(data.locale));
		}
	}
</script>

<Screen
	locale={data.locale}
	title={classroom?.name ?? t.notFound.title}
	subtitle={classroom && t.counts.children(children.length)}
>
	{#if classroom}
		{#if app.admin}
			<p class="-mt-4 text-muted">
				{teachers.length
					? t.classroom.teachers(teachers.map((teacher) => teacher.name))
					: t.classroom.noTeachers}
			</p>
			<div class="flex flex-wrap gap-2">
				<a
					class={button.primary}
					href={appPath(data.locale, 'child/new', { classroom: classroom.id })}
				>
					<Icon name="plus" class="size-4" />{t.classroom.addChild}
				</a>
				<button class={button.secondary} type="button" onclick={() => open('rename', true)}>
					<Icon name="pencil" class="size-4" />{t.actions.rename}
				</button>
				{#if !children.length}
					<button class={button.danger} type="button" onclick={() => open('delete', true)}>
						<Icon name="trash" class="size-4" />{t.classroom.delete}
					</button>
				{/if}
			</div>
			{#if renaming}
				<div class={surface}>
					<NameForm
						label={t.home.classroomName}
						value={classroom.name}
						submitLabel={t.actions.save}
						cancelLabel={t.actions.cancel}
						busy={task.busy}
						{error}
						onsubmit={rename}
						oncancel={() => open('rename', false)}
					/>
				</div>
			{/if}
		{/if}

		<section class="grid gap-3" aria-labelledby="children-title">
			<h2 id="children-title" class="text-2xl">{t.classroom.children}</h2>
			{#if children.length}
				<ul class="grid gap-2">
					{#each children as child (child.id)}
						<ListLink
							href={appPath(data.locale, 'child', { id: child.id })}
							title={child.name}
							detail={cardNames(child.families) || t.classroom.noCards}
						/>
					{/each}
				</ul>
			{:else}
				<p class="text-muted">{t.classroom.empty}</p>
			{/if}
		</section>

		{#if deleting}
			<ConfirmDialog
				title={t.classroom.deleteTitle(classroom.name)}
				copy={t.classroom.deleteCopy}
				confirmLabel={t.classroom.delete}
				cancelLabel={t.actions.cancel}
				busyLabel={t.actions.working}
				danger
				busy={task.busy}
				{error}
				onconfirm={remove}
				onclose={() => open('delete', false)}
			/>
		{/if}
	{:else}
		<p class="text-muted">{t.notFound.copy}</p>
	{/if}
</Screen>
