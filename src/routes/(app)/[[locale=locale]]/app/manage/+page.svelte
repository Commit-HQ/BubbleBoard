<script lang="ts">
	import FieldForm from '$lib/app/FieldForm.svelte';
	import Screen from '$lib/app/Screen.svelte';
	import { getApp } from '$lib/app/state.svelte';
	import Icon, { type IconName } from '$lib/components/Icon.svelte';
	import IconTile from '$lib/components/IconTile.svelte';
	import { messages } from '$lib/i18n';
	import { appPath } from '$lib/paths';
	import type { PageProps } from './$types';

	// Where staff manage the kindergarten, from the header: a tile for each of their classrooms, or every
	// classroom for admins, who also add classrooms and manage teachers here.
	let { data }: PageProps = $props();
	const app = getApp();
	const t = $derived(messages[data.locale].app);
	let adding = $state(false);

	const childCounts = $derived(
		app.catalog.children.reduce(
			(counts, { classroom }) => counts.set(classroom, (counts.get(classroom) ?? 0) + 1),
			new Map<string, number>()
		)
	);
	// The recovery card is listed with the teachers, but it isn't one.
	const teacherCount = $derived(app.catalog.teachers.filter((teacher) => !teacher.recovery).length);

	async function addClassroom(name: string) {
		await app.addClassroom(name);
		adding = false;
	}
</script>

{#snippet tile(
	href: string,
	icon: IconName,
	title: string,
	detail: string,
	tone: 'sunrise' | 'ink'
)}
	<li>
		<a
			class="flex h-full min-h-36 flex-col rounded-3xl glass p-5 transition hover:-translate-y-0.5 hover:bg-white/75 motion-reduce:hover:translate-y-0"
			{href}
		>
			<IconTile {icon} {tone} />
			<span class="mt-auto pt-4 text-lg leading-snug font-bold">{title}</span>
			<span class="text-sm text-muted">{detail}</span>
		</a>
	</li>
{/snippet}

<Screen
	locale={data.locale}
	title={t.manage.title}
	subtitle={app.admin ? t.manage.admin : t.manage.teacher}
>
	<ul class="grid grid-cols-2 gap-3 sm:gap-4">
		{#each app.catalog.classrooms as classroom (classroom.id)}
			{@render tile(
				appPath(data.locale, 'classroom', { id: classroom.id }),
				'shapes',
				classroom.name,
				t.counts.children(childCounts.get(classroom.id) ?? 0),
				'sunrise'
			)}
		{/each}
		{#if app.admin}
			<li class={adding ? 'col-span-2' : undefined}>
				{#if adding}
					<div class="rounded-3xl glass p-5">
						<FieldForm
							locale={data.locale}
							label={t.manage.classroomName}
							placeholder={t.manage.classroomExample}
							submitLabel={t.manage.addClassroom}
							onsubmit={addClassroom}
							oncancel={() => (adding = false)}
						/>
					</div>
				{:else}
					<button
						class="flex h-full min-h-36 w-full flex-col rounded-3xl border-2 border-dashed border-ink/15 p-5 text-left transition hover:border-accent/50 hover:bg-white/40"
						type="button"
						onclick={() => (adding = true)}
					>
						<span
							class="grid size-11 place-items-center rounded-2xl bg-white/80 text-accent ring-1 ring-ink/10"
						>
							<Icon name="plus" />
						</span>
						<span class="mt-auto pt-4 text-lg leading-snug font-bold">{t.manage.addClassroom}</span>
					</button>
				{/if}
			</li>
			{@render tile(
				appPath(data.locale, 'teachers'),
				'users',
				t.manage.teachers,
				t.counts.teachers(teacherCount),
				'ink'
			)}
		{/if}
	</ul>

	{#if !app.catalog.classrooms.length}
		<p class="text-muted">{app.admin ? t.manage.emptyAdmin : t.manage.emptyTeacher}</p>
	{/if}
</Screen>
