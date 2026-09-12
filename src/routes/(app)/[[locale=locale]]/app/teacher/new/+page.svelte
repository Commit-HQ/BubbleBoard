<script lang="ts">
	import { goto } from '$app/navigation';
	import CardSheet, { type PrintableCard } from '$lib/app/CardSheet.svelte';
	import Screen from '$lib/app/Screen.svelte';
	import { getApp, Task, type TeacherValues } from '$lib/app/state.svelte';
	import TeacherForm from '$lib/app/TeacherForm.svelte';
	import { errorMessage, listNames, messages } from '$lib/i18n';
	import { appPath } from '$lib/paths';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const app = getApp();
	const t = $derived(messages[data.locale].app);
	const task = new Task(app);
	let printed = $state.raw<PrintableCard[]>();

	async function create(values: TeacherValues) {
		await task.run(async () => {
			const secret = await app.addTeacher(values);
			const detail = listNames(data.locale, app.classroomNames(values.classrooms));
			printed = [{ secret, name: values.name, kind: values.admin ? 'admin' : 'teacher', detail }];
		});
	}
</script>

{#if printed}
	<CardSheet
		locale={data.locale}
		cards={printed}
		ondone={() => goto(appPath(data.locale, 'teachers'))}
	/>
{:else}
	<Screen
		locale={data.locale}
		title={t.teacher.newTitle}
		need="admin"
		back={{ href: appPath(data.locale, 'teachers'), label: t.teachers.title }}
	>
		<TeacherForm
			locale={data.locale}
			submitLabel={t.teacher.create}
			busy={task.busy}
			error={task.error && errorMessage(data.locale, task.error)}
			onsubmit={create}
		/>
	</Screen>
{/if}
