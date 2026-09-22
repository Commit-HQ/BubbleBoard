<script lang="ts">
	import { goto } from '$app/navigation';
	import CardSheet, { type PrintableCard } from '$lib/app/CardSheet.svelte';
	import ConfirmDialog from '$lib/app/ConfirmDialog.svelte';
	import Screen from '$lib/app/Screen.svelte';
	import { getApp, type TeacherValues } from '$lib/app/state.svelte';
	import TeacherForm from '$lib/app/TeacherForm.svelte';
	import { button, queryParam } from '$lib/app/ui';
	import Icon from '$lib/components/Icon.svelte';
	import { listNames, messages, teacherName } from '$lib/i18n';
	import { cardKind, namesOf } from '$lib/kindergarten';
	import { appPath } from '$lib/paths';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const app = getApp();
	const t = $derived(messages[data.locale].app);
	const id = $derived(queryParam('id'));
	const teacher = $derived(app.catalog.teachers.find((candidate) => candidate.id === id));
	const self = $derived(teacher !== undefined && teacher.id === app.me?.id);
	const teachersPage = $derived(appPath(data.locale, 'teachers'));
	let saved = $state(false);
	let confirming = $state<'replace' | 'remove'>();
	let printed = $state.raw<PrintableCard[]>();

	/** The question to ask, and the change it confirms. */
	const dialog = $derived.by(() => {
		if (!confirming || !teacher) return undefined;
		const current = teacher;
		const name = teacherName(data.locale, current);
		if (confirming === 'replace') {
			return {
				title: t.card.replaceTitle(name),
				copy: t.card.replaceCopy,
				confirm: t.card.replace,
				run: async () => {
					const secret = await app.replaceTeacherCard(current.id);
					confirming = undefined;
					const detail = listNames(
						data.locale,
						namesOf(app.catalog.classrooms, current.classrooms)
					);
					printed = [{ secret, kind: cardKind(current), name: current.name, detail }];
				}
			};
		}
		return {
			title: t.teacher.removeTitle(name),
			copy: t.teacher.removeCopy(name),
			confirm: t.teacher.remove,
			danger: true,
			run: async () => {
				await app.removeTeacher(current.id);
				await goto(teachersPage);
			}
		};
	});

	async function save(teacher: string, values: TeacherValues) {
		await app.changeTeacher(teacher, values);
		saved = true;
	}
</script>

{#if printed}
	<CardSheet locale={data.locale} cards={printed} ondone={() => (printed = undefined)} />
{:else}
	<Screen
		locale={data.locale}
		title={teacher ? teacherName(data.locale, teacher) : t.notFound.title}
		need="head"
		back={teachersPage}
	>
		{#if teacher}
			{#if teacher.recovery}
				<!-- The recovery card has no name or classrooms to edit, and it isn't removed. -->
				<p class="-mt-4 text-muted">{t.teacher.recovery}</p>
			{:else}
				{#if self}<p class="-mt-4 text-muted">{t.teacher.self}</p>{/if}
				<TeacherForm
					locale={data.locale}
					{teacher}
					{self}
					submitLabel={t.actions.save}
					onsubmit={(values) => save(teacher.id, values)}
					oninput={() => (saved = false)}
				/>
				<p class="-mt-2 min-h-6 font-semibold" role="status">{saved ? t.actions.saved : ''}</p>
			{/if}
			<div class="flex flex-wrap gap-2 border-t border-ink/10 pt-6">
				<button class={button.secondary} type="button" onclick={() => (confirming = 'replace')}>
					<Icon name="refresh" class="size-4" />{t.card.replace}
				</button>
				{#if !self && !teacher.recovery}
					<button class={button.danger} type="button" onclick={() => (confirming = 'remove')}>
						<Icon name="trash" class="size-4" />{t.teacher.remove}
					</button>
				{/if}
			</div>
			{#if dialog}
				<ConfirmDialog
					locale={data.locale}
					title={dialog.title}
					copy={dialog.copy}
					confirmLabel={dialog.confirm}
					danger={dialog.danger}
					onconfirm={dialog.run}
					onclose={() => (confirming = undefined)}
				/>
			{/if}
		{:else}
			<p class="text-muted">{t.notFound.copy}</p>
		{/if}
	</Screen>
{/if}
