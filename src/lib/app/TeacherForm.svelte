<script lang="ts">
	import { errorMessage, messages, type Locale } from '$lib/i18n';
	import type { Teacher } from '$lib/kindergarten';
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

	function submit(event: SubmitEvent & { currentTarget: EventTarget & HTMLFormElement }) {
		event.preventDefault();
		const form = new FormData(event.currentTarget);
		const name = formText(form, 'name');
		if (!name) return;
		const admin = self ? teacher?.admin === true : form.has('admin');
		task.run(() => onsubmit({ name, admin, classrooms: form.getAll('classroom').map(String) }));
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
	<fieldset class="grid gap-3">
		<legend class="mb-2 font-semibold">{t.classrooms}</legend>
		{#each app.catalog.classrooms as classroom (classroom.id)}
			<label class="flex items-center gap-3">
				<input
					class={field.check}
					type="checkbox"
					name="classroom"
					value={classroom.id}
					checked={teacher?.classrooms.includes(classroom.id)}
				/>{classroom.name}
			</label>
		{:else}
			<p class="text-muted">{t.noClassrooms}</p>
		{/each}
	</fieldset>
	{#if self}
		<p>
			<span class="block font-semibold">{t.admin}</span>
			<span class={field.hint}>{t.selfAdmin}</span>
		</p>
	{:else}
		<label class="flex items-start gap-3">
			<input class="{field.check} mt-0.5" type="checkbox" name="admin" checked={teacher?.admin} />
			<span>
				<span class="block font-semibold">{t.admin}</span>
				<span class={field.hint}>{t.adminHint}</span>
			</span>
		</label>
	{/if}
	{#if task.error}<p class={alert} role="alert">{errorMessage(locale, task.error)}</p>{/if}
	<button class="{button.primary} justify-self-start" type="submit" disabled={task.busy}>
		{submitLabel}
	</button>
</form>
