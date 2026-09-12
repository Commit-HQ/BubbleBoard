<script lang="ts">
	import { goto } from '$app/navigation';
	import ConfirmDialog from '$lib/app/ConfirmDialog.svelte';
	import FieldForm from '$lib/app/FieldForm.svelte';
	import ListLink from '$lib/app/ListLink.svelte';
	import Screen from '$lib/app/Screen.svelte';
	import { getApp } from '$lib/app/state.svelte';
	import { button, queryParam, surface } from '$lib/app/ui';
	import Icon from '$lib/components/Icon.svelte';
	import { listNames, messages } from '$lib/i18n';
	import { namesOf } from '$lib/kindergarten';
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
	let open = $state<'rename' | 'delete'>();

	async function rename(classroom: string, name: string) {
		await app.renameClassroom(classroom, name);
		open = undefined;
	}

	async function remove(classroom: string) {
		await app.deleteClassroom(classroom);
		await goto(appPath(data.locale));
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
				<button class={button.secondary} type="button" onclick={() => (open = 'rename')}>
					<Icon name="pencil" class="size-4" />{t.actions.rename}
				</button>
				{#if !children.length}
					<button class={button.danger} type="button" onclick={() => (open = 'delete')}>
						<Icon name="trash" class="size-4" />{t.classroom.delete}
					</button>
				{/if}
			</div>
			{#if open === 'rename'}
				<div class={surface}>
					<FieldForm
						locale={data.locale}
						label={t.home.classroomName}
						value={classroom.name}
						submitLabel={t.actions.save}
						onsubmit={(name) => rename(classroom.id, name)}
						oncancel={() => (open = undefined)}
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
							detail={listNames(data.locale, namesOf(app.catalog.families, child.families)) ||
								t.classroom.noCards}
						/>
					{/each}
				</ul>
			{:else}
				<p class="text-muted">{t.classroom.empty}</p>
			{/if}
		</section>

		{#if open === 'delete'}
			<ConfirmDialog
				locale={data.locale}
				title={t.classroom.deleteTitle(classroom.name)}
				copy={t.classroom.deleteCopy}
				confirmLabel={t.classroom.delete}
				danger
				onconfirm={() => remove(classroom.id)}
				onclose={() => (open = undefined)}
			/>
		{/if}
	{:else}
		<p class="text-muted">{t.notFound.copy}</p>
	{/if}
</Screen>
