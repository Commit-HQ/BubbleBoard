<script lang="ts">
	import ListLink from '$lib/app/ListLink.svelte';
	import Screen from '$lib/app/Screen.svelte';
	import { getApp } from '$lib/app/state.svelte';
	import { button } from '$lib/app/ui';
	import Icon from '$lib/components/Icon.svelte';
	import { listNames, messages, teacherName } from '$lib/i18n';
	import { namesOf, type Teacher } from '$lib/kindergarten';
	import { appPath } from '$lib/paths';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const app = getApp();
	const t = $derived(messages[data.locale].app.teachers);
	const roles = $derived(messages[data.locale].app.roles);
	const teachers = $derived(app.catalog.teachers.filter((teacher) => !teacher.recovery));
	// The recovery card is kept with the staff cards, but it's nobody's, so it's set apart below them.
	const recovery = $derived(app.catalog.teachers.find((teacher) => teacher.recovery));

	function title(teacher: Teacher) {
		const name = teacherName(data.locale, teacher);
		return teacher.id === app.me?.id ? `${name} (${t.you})` : name;
	}

	// A plain teacher is named by her classrooms alone; the two roles above her say so first.
	function detail(teacher: Teacher) {
		const classrooms = listNames(data.locale, namesOf(app.catalog.classrooms, teacher.classrooms));
		const role = teacher.role === 'teacher' ? '' : roles[teacher.role];
		if (!role) return classrooms || t.noClassrooms;
		return classrooms ? `${role} · ${classrooms}` : role;
	}
</script>

<Screen locale={data.locale} title={t.title} need="head" back={appPath(data.locale, 'manage')}>
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

	{#if recovery}
		<section class="grid gap-3 border-t border-ink/10 pt-6" aria-labelledby="recovery-title">
			<h2 id="recovery-title" class="text-2xl">{t.recoveryTitle}</h2>
			<ul class="grid gap-2">
				<ListLink
					href={appPath(data.locale, 'teacher', { id: recovery.id })}
					title={title(recovery)}
					detail={t.recoveryDetail}
					icon="key"
				/>
			</ul>
		</section>
	{/if}
</Screen>
