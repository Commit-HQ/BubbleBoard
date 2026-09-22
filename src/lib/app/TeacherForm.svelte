<script lang="ts">
	import type { StaffRole } from '$lib/api';
	import { errorMessage, messages, type Locale } from '$lib/i18n';
	import type { Teacher } from '$lib/kindergarten';
	import Checklist from './Checklist.svelte';
	import RadioCard from './RadioCard.svelte';
	import { getApp, Task, type TeacherValues } from './state.svelte';
	import { alert, button, field, formText, surface } from './ui';

	// A staff member's name, what she may do, and, unless she runs the whole kindergarten, the classrooms
	// she's in. Nobody can lower her own role here: that would lock her out of this very page, so another
	// head does it.
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
	const roles = $derived(messages[locale].app.roles);
	const task = new Task();
	let chosen = $state(startingClassrooms());
	let role = $state<StaffRole>(startingRole());

	/** The role the form starts with, read once, like the ticked classrooms below. */
	function startingRole(): StaffRole {
		return teacher?.role ?? 'teacher';
	}

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
		// Classrooms that still exist, in the catalog's order. A head runs them all, so she holds none.
		const classrooms =
			role === 'head'
				? []
				: app.catalog.classrooms
						.filter((classroom) => chosen.includes(classroom.id))
						.map((classroom) => classroom.id);
		task.run(() => onsubmit({ name, role, classrooms }));
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
	{#if self}
		<p>
			<span class="block font-semibold">{t.role}</span>
			<span class="block">{roles[role]}</span>
			<span class={field.hint}>{t.selfRole}</span>
		</p>
	{:else}
		<div class="grid gap-2" role="radiogroup" aria-label={t.role}>
			<span class="font-semibold">{t.role}</span>
			<RadioCard
				name="role"
				label={roles.teacher}
				hint={t.teacherHint}
				checked={role === 'teacher'}
				onchange={() => (role = 'teacher')}
			/>
			<RadioCard
				name="role"
				label={roles.lead}
				hint={t.leadHint}
				checked={role === 'lead'}
				onchange={() => (role = 'lead')}
			/>
			<RadioCard
				name="role"
				label={roles.head}
				hint={t.headHint}
				checked={role === 'head'}
				onchange={() => (role = 'head')}
			/>
		</div>
	{/if}
	<!-- A head is in no classroom, so there's nothing to tick for her. -->
	{#if role !== 'head'}
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
	{/if}
	{#if task.error}<p class={alert} role="alert">{errorMessage(locale, task.error)}</p>{/if}
	<button class="{button.primary} justify-self-start" type="submit" disabled={task.busy}>
		{submitLabel}
	</button>
</form>
