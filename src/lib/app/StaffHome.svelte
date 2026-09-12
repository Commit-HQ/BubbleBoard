<script lang="ts">
	import Bubble from '$lib/components/Bubble.svelte';
	import Icon, { type IconName } from '$lib/components/Icon.svelte';
	import IconTile from '$lib/components/IconTile.svelte';
	import { messages, teacherName, type Locale } from '$lib/i18n';
	import { cardKind } from '$lib/kindergarten';
	import { appPath } from '$lib/paths';
	import Board from './Board.svelte';
	import FieldForm from './FieldForm.svelte';
	import { getApp } from './state.svelte';
	import { button } from './ui';

	let { locale }: { locale: Locale } = $props();
	const app = getApp();
	const t = $derived(messages[locale].app);
	let adding = $state(false);

	const childCounts = $derived(
		app.catalog.children.reduce(
			(counts, { classroom }) => counts.set(classroom, (counts.get(classroom) ?? 0) + 1),
			new Map<string, number>()
		)
	);
	// The recovery card is listed with the teachers, but it isn't one.
	const teacherCount = $derived(app.catalog.teachers.filter((teacher) => !teacher.recovery).length);
	const kind = $derived(cardKind({ admin: app.admin, recovery: app.me?.recovery === true }));
	/** Teachers post to their own classrooms, admins to any. */
	const canPost = $derived(
		app.admin ? app.catalog.classrooms.length > 0 : (app.me?.classrooms.length ?? 0) > 0
	);

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

<section class="grid gap-8">
	<div class="relative isolate">
		<!-- The logo's big and small bubbles, drifting beside the greeting. -->
		<Bubble class="-top-6 right-0 -z-10 size-20 sm:size-24" />
		<Bubble class="top-14 right-20 -z-10 size-9 sm:right-28" />
		<h1 class="pr-24 text-4xl sm:text-5xl">
			{t.home.greeting(app.me ? teacherName(locale, app.me) : '')}
		</h1>
		<p class="mt-2 text-lg text-muted">{app.admin ? t.home.admin : t.home.teacher}</p>
		{#if canPost}
			<a class="{button.primary} mt-6" href={appPath(locale, 'notice/new')}>
				<Icon name="plus" class="size-4" />{t.notices.new}
			</a>
		{/if}
	</div>

	<ul class="grid grid-cols-2 gap-3 sm:gap-4">
		{#each app.catalog.classrooms as classroom (classroom.id)}
			{@render tile(
				appPath(locale, 'classroom', { id: classroom.id }),
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
							{locale}
							label={t.home.classroomName}
							placeholder={t.home.classroomExample}
							submitLabel={t.home.addClassroom}
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
						<span class="mt-auto pt-4 text-lg leading-snug font-bold">{t.home.addClassroom}</span>
					</button>
				{/if}
			</li>
			{@render tile(
				appPath(locale, 'teachers'),
				'users',
				t.home.teachers,
				t.counts.teachers(teacherCount),
				'ink'
			)}
		{/if}
		{@render tile(appPath(locale, 'device'), 'phone', t.home.device, t.card.kinds[kind], 'ink')}
	</ul>

	{#if !app.catalog.classrooms.length}
		<p class="text-muted">{app.admin ? t.home.emptyAdmin : t.home.emptyTeacher}</p>
	{/if}

	<section class="grid gap-4" aria-labelledby="notices-title">
		<h2 id="notices-title" class="text-3xl">{t.notices.title}</h2>
		<Board {locale} empty={t.notices.emptyStaff} />
	</section>
</section>
