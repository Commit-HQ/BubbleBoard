<script lang="ts">
	import { errorMessage, messages, type Locale } from '$lib/i18n';
	import type { Teacher } from '$lib/kindergarten';
	import CheckCard from './CheckCard.svelte';
	import Checklist from './Checklist.svelte';
	import { getApp, Task, type TeacherValues } from './state.svelte';
	import { alert, button, field, formText, surface } from './ui';

	// A teacher's name, classrooms, and admin rights. Admins can't take away their own rights here: that
	// would lock them out of this very page, so another admin does it.
	let {
		locale,
		teacher,
		self = false,
		submitLabel,
		onsubmit,
		oninput
	}: {
		locale: Locale;
		teacher?: Teacher;
		self?: boolean;
		submitLabel: string;
		onsubmit: (values: TeacherValues) => Promise<unknown>;
		oninput?: () => void;
	} = $props();

	const app = getApp();
	const t = $derived(messages[locale].app.teacher);
	const task = new Task();
	let chosen = $state(startingClassrooms());

	/**
	 * The ticked classrooms the form starts with. The teacher page mounts a form for its one teacher, and
	 * reading the teacher in here, once, tells Svelte that's intended.
	 */
	function startingClassrooms() {
		return [...(teacher?.classrooms ?? [])];
	}

	function submit(event: SubmitEvent & { currentTarget: EventTarget & HTMLFormElement }) {
		event.preventDefault();
		const form = new FormData(event.currentTarget);
		const name = formText(form, 'name');
		const admin = self ? teacher?.admin === true : form.has('admin');
		// Classrooms that still exist, in the catalog's order.
		const classrooms = app.catalog.classrooms
			.filter((classroom) => chosen.includes(classroom.id))
			.map((classroom) => classroom.id);
		task.run(() => onsubmit({ name, admin, classrooms }));
	}
</script>

<form class="{surface} grid gap-6" onsubmit={submit} {oninput}>
	<label class={field.label}>
		<span class={field.name}>{t.name}</span>
		<input
			class={field.input}
			name="name"
			value={teacher?.name ?? ''}
			required
			maxlength="80"
			autocomplete="off"
		/>
	</label>
	{#if app.catalog.classrooms.length}
		<Checklist
			{locale}
			label={t.classrooms}
			options={app.catalog.classrooms.map((classroom) => ({
				value: classroom.id,
				label: classroom.name
			}))}
			bind:chosen
		/>
	{:else}
		<p>
			<span class="block font-semibold">{t.classrooms}</span>
			<span class="text-muted">{t.noClassrooms}</span>
		</p>
	{/if}
	{#if self}
		<p>
			<span class="block font-semibold">{t.admin}</span>
			<span class={field.hint}>{t.selfAdmin}</span>
		</p>
	{:else}
		<CheckCard name="admin" label={t.admin} hint={t.adminHint} checked={teacher?.admin} />
	{/if}
	{#if task.error}<p class={alert} role="alert">{errorMessage(locale, task.error)}</p>{/if}
	<button class="{button.primary} justify-self-start" type="submit" disabled={task.busy}>
		{submitLabel}
	</button>
</form>
