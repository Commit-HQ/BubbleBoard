<script lang="ts">
	import { goto } from '$app/navigation';
	import CardSheet, { type PrintableCard } from '$lib/app/CardSheet.svelte';
	import ConfirmDialog from '$lib/app/ConfirmDialog.svelte';
	import Screen from '$lib/app/Screen.svelte';
	import { getApp, Task, type TeacherValues } from '$lib/app/state.svelte';
	import TeacherForm from '$lib/app/TeacherForm.svelte';
	import { button, queryParam } from '$lib/app/ui';
	import Icon from '$lib/components/Icon.svelte';
	import { errorMessage, listNames, messages, teacherName } from '$lib/i18n';
	import { appPath } from '$lib/paths';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const app = getApp();
	const t = $derived(messages[data.locale].app);
	const id = $derived(queryParam('id'));
	const teacher = $derived(app.catalog.teachers.find((candidate) => candidate.id === id));
	const self = $derived(teacher !== undefined && teacher.id === app.me?.id);
	const teachersPage = $derived(appPath(data.locale, 'teachers'));
	const task = new Task(app);
	const error = $derived(task.error && errorMessage(data.locale, task.error));
	let saved = $state(false);
	let confirming = $state<'replace' | 'remove'>();
	let printed = $state.raw<PrintableCard[]>();

	function ask(next?: 'replace' | 'remove') {
		task.reset();
		confirming = next;
	}

	async function save(values: TeacherValues) {
		const current = teacher;
		if (current) saved = await task.run(() => app.changeTeacher(current.id, values));
	}

	async function confirm() {
		const current = teacher;
		if (!current) return;
		if (confirming === 'replace') {
			await task.run(async () => {
				const secret = await app.replaceTeacherCard(current.id);
				confirming = undefined;
				const kind = current.recovery ? 'recovery' : current.admin ? 'admin' : 'teacher';
				const detail = listNames(data.locale, app.classroomNames(current.classrooms));
				printed = [{ secret, kind, name: current.name, detail }];
			});
		} else if (await task.run(() => app.removeTeacher(current.id))) {
			await goto(teachersPage);
		}
	}
</script>

{#if printed}
	<CardSheet locale={data.locale} cards={printed} ondone={() => (printed = undefined)} />
{:else}
	<Screen
		locale={data.locale}
		title={teacher ? teacherName(data.locale, teacher) : t.notFound.title}
		need="admin"
		back={{ href: teachersPage, label: t.teachers.title }}
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
					busy={task.busy}
					error={confirming ? undefined : error}
					onsubmit={save}
					oninput={() => (saved = false)}
				/>
				<p class="-mt-2 min-h-6 font-semibold" role="status">{saved ? t.actions.saved : ''}</p>
			{/if}
			<div class="flex flex-wrap gap-2 border-t border-ink/10 pt-6">
				<button class={button.secondary} type="button" onclick={() => ask('replace')}>
					<Icon name="refresh" class="size-4" />{t.card.replace}
				</button>
				{#if !self && !teacher.recovery}
					<button class={button.danger} type="button" onclick={() => ask('remove')}>
						<Icon name="trash" class="size-4" />{t.teacher.remove}
					</button>
				{/if}
			</div>
			{#if confirming}
				{@const name = teacherName(data.locale, teacher)}
				{@const replacing = confirming === 'replace'}
				<ConfirmDialog
					title={replacing ? t.card.replaceTitle(name) : t.teacher.removeTitle(name)}
					copy={replacing ? t.card.replaceCopy : t.teacher.removeCopy(name)}
					confirmLabel={replacing ? t.card.replace : t.teacher.remove}
					cancelLabel={t.actions.cancel}
					busyLabel={t.actions.working}
					danger={!replacing}
					busy={task.busy}
					{error}
					onconfirm={confirm}
					onclose={() => ask()}
				/>
			{/if}
		{:else}
			<p class="text-muted">{t.notFound.copy}</p>
		{/if}
	</Screen>
{/if}
