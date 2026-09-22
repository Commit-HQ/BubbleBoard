<script lang="ts">
	import AddClassroomTile from '$lib/app/AddClassroomTile.svelte';
	import ListLink from '$lib/app/ListLink.svelte';
	import Screen from '$lib/app/Screen.svelte';
	import { getApp } from '$lib/app/state.svelte';
	import IconTile from '$lib/components/IconTile.svelte';
	import { messages } from '$lib/i18n';
	import { appPath } from '$lib/paths';
	import type { PageProps } from './$types';

	// Where staff manage the kindergarten, from the header: a tile for each of their classrooms, or every
	// classroom for the head, who also adds classrooms here and, in a section of their own, opens the teachers.
	let { data }: PageProps = $props();
	const app = getApp();
	const t = $derived(messages[data.locale].app);

	const childCounts = $derived(
		app.catalog.children.reduce(
			(counts, { classroom }) => counts.set(classroom, (counts.get(classroom) ?? 0) + 1),
			new Map<string, number>()
		)
	);
	// The recovery card is listed with the teachers, but it isn't one.
	const teacherCount = $derived(app.catalog.teachers.filter((teacher) => !teacher.recovery).length);
</script>

<Screen
	locale={data.locale}
	title={t.manage.title}
	subtitle={app.head ? t.manage.head : t.manage.teacher}
>
	<section class="grid gap-3" aria-labelledby="classrooms-title">
		<!-- Teachers only have classrooms here, which the subtitle names already. -->
		<h2 id="classrooms-title" class={app.head ? 'text-2xl' : 'sr-only'}>
			{t.manage.classrooms}
		</h2>
		<ul class="grid grid-cols-2 gap-3 sm:gap-4">
			{#each app.catalog.classrooms as classroom (classroom.id)}
				<li>
					<a
						class="flex h-full min-h-36 flex-col rounded-3xl glass p-5 transition hover:-translate-y-0.5 hover:bg-white/75 motion-reduce:hover:translate-y-0"
						href={appPath(data.locale, 'classroom', { id: classroom.id })}
					>
						<IconTile icon="shapes" />
						<span class="mt-auto pt-4 text-lg leading-snug font-bold">{classroom.name}</span>
						<span class="text-sm text-muted">
							{t.counts.children(childCounts.get(classroom.id) ?? 0)}
						</span>
					</a>
				</li>
			{/each}
			{#if app.head}<AddClassroomTile locale={data.locale} />{/if}
		</ul>
		{#if !app.catalog.classrooms.length}
			<p class="text-muted">{app.head ? t.manage.emptyHead : t.manage.emptyTeacher}</p>
		{/if}
	</section>

	{#if app.head}
		<section class="grid gap-3 border-t border-ink/10 pt-6" aria-labelledby="teachers-title">
			<h2 id="teachers-title" class="text-2xl">{t.manage.teachers}</h2>
			<ul class="grid gap-2">
				<ListLink
					href={appPath(data.locale, 'teachers')}
					title={t.counts.teachers(teacherCount)}
					detail={t.manage.teachersDetail}
					icon="users"
				/>
			</ul>
		</section>
	{/if}
</Screen>
