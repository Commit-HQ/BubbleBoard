<script lang="ts">
	import type { StaffRole } from '$lib/api';
	import { errorMessage, messages, type Locale } from '$lib/i18n';
	import type { Teacher } from '$lib/kindergarten';
	import Checklist from './Checklist.svelte';
	import RadioCard from './RadioCard.svelte';
	import { getApp, Task, type TeacherValues } from './state.svelte';
	import { alert, button, field, formText, surface } from './ui';

	// A staff member's name, what she may do, and the classrooms she's in. A head runs every classroom, so
	// her ticks only name the ones she teaches in. Nobody can lower her own role here: that would lock her
	// out of this very page, so another head does it.
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
	const roleOptions: StaffRole[] = ['teacher', 'lead', 'head'];
	const hints = $derived<Record<StaffRole, string>>({
		teacher: t.teacherHint,
		lead: t.leadHint,
		head: t.headHint
	});

	/**
	 * What the form starts with: her role and ticked classrooms, and the catalog revision they were read at, so
	 * saving fails as stale if another head changed her since. The teacher page mounts a form for its one
	 * teacher, and reading her in here, once, tells Svelte that's intended.
	 */
	function starting() {
		return {
			role: teacher?.role ?? 'teacher',
			chosen: [...(teacher?.classrooms ?? [])],
			revision: app.catalog.revision
		};
	}
	const start = starting();
	let chosen = $state(start.chosen);
	let role = $state<StaffRole>(start.role);
	let revision = $state(start.revision);

	async function submit(event: SubmitEvent & { currentTarget: EventTarget & HTMLFormElement }) {
		event.preventDefault();
		const form = new FormData(event.currentTarget);
		const name = formText(form, 'name');
		// Classrooms that still exist, in the catalog's order.
		const classrooms = app.catalog.classrooms
			.filter((classroom) => chosen.includes(classroom.id))
			.map((classroom) => classroom.id);
		await task.run(async () => {
			await onsubmit({ name, role, classrooms, revision });
			// The records came back with this change in them, so the next save is made over them.
			revision = app.catalog.revision;
		});
		// Someone else got there first: the reload brought her as they left her in through `teacher`, so the
		// form shows that and can be saved again.
		if (task.error === 'stale' && teacher) {
			role = teacher.role;
			chosen = [...teacher.classrooms];
			revision = app.catalog.revision;
		}
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
			{#each roleOptions as option (option)}
				<RadioCard
					name="role"
					label={roles[option]}
					hint={hints[option]}
					checked={role === option}
					onchange={() => (role = option)}
				/>
			{/each}
		</div>
	{/if}
	{#if app.catalog.classrooms.length}
		<div class="grid gap-2">
			<Checklist
				{locale}
				label={t.classrooms}
				options={app.catalog.classrooms.map((classroom) => ({
					value: classroom.id,
					label: classroom.name
				}))}
				bind:chosen
			/>
			<!-- A head reaches every classroom anyway; her ticks only say where she teaches. -->
			{#if role === 'head'}<p class={field.hint}>{t.headClassrooms}</p>{/if}
		</div>
	{:else}
		<p>
			<span class="block font-semibold">{t.classrooms}</span>
			<span class="text-muted">{t.noClassrooms}</span>
		</p>
	{/if}
	{#if task.error}<p class={alert} role="alert">{errorMessage(locale, task.error)}</p>{/if}
	<button class="{button.primary} justify-self-start" type="submit" disabled={task.busy}>
		{submitLabel}
	</button>
</form>
