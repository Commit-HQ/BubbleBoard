<script lang="ts">
	import ListLink from '$lib/app/ListLink.svelte';
	import Screen from '$lib/app/Screen.svelte';
	import { getApp } from '$lib/app/state.svelte';
	import { button } from '$lib/app/ui';
	import Icon from '$lib/components/Icon.svelte';
	import { listNames, messages, teacherName } from '$lib/i18n';
	import type { Teacher } from '$lib/kindergarten';
	import { appPath } from '$lib/paths';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const app = getApp();
	const t = $derived(messages[data.locale].app.teachers);
	// The recovery card comes last: it's kept away, not someone at work.
	const teachers = $derived(
		app.catalog.teachers.toSorted((a, b) => Number(a.recovery) - Number(b.recovery))
	);

	function title(teacher: Teacher) {
		const name = teacherName(data.locale, teacher);
		return teacher.id === app.me?.id ? `${name} (${t.you})` : name;
	}

	function detail(teacher: Teacher) {
		const classrooms = listNames(data.locale, app.classroomNames(teacher.classrooms));
		if (teacher.admin) return classrooms ? `${t.admin} · ${classrooms}` : t.admin;
		return classrooms || t.noClassrooms;
	}
</script>

<Screen locale={data.locale} title={t.title} need="admin">
	<a class="{button.primary} justify-self-start" href={appPath(data.locale, 'teacher/new')}>
		<Icon name="plus" class="size-4" />{t.add}
	</a>
	<ul class="grid gap-2">
		{#each teachers as teacher (teacher.id)}
			<ListLink
				href={appPath(data.locale, 'teacher', { id: teacher.id })}
				title={title(teacher)}
				detail={detail(teacher)}
			/>
		{/each}
	</ul>
</Screen>
