<script lang="ts">
	import { goto } from '$app/navigation';
	import CardSheet, { type PrintableCard } from '$lib/app/CardSheet.svelte';
	import Screen from '$lib/app/Screen.svelte';
	import { getApp, type TeacherValues } from '$lib/app/state.svelte';
	import TeacherForm from '$lib/app/TeacherForm.svelte';
	import { listNames, messages } from '$lib/i18n';
	import { cardKind, namesOf } from '$lib/kindergarten';
	import { appPath } from '$lib/paths';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const app = getApp();
	const t = $derived(messages[data.locale].app);
	let printed = $state.raw<PrintableCard[]>();

	async function create(values: TeacherValues) {
		const secret = await app.addTeacher(values);
		const detail = listNames(data.locale, namesOf(app.catalog.classrooms, values.classrooms));
		const kind = cardKind({ admin: values.admin, recovery: false });
		printed = [{ secret, name: values.name, kind, detail }];
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
		<TeacherForm locale={data.locale} submitLabel={t.teacher.create} onsubmit={create} />
	</Screen>
{/if}
