<script lang="ts">
	import { errorMessage, messages, type Locale } from '$lib/i18n';
	import {
		defaultNoticeDays,
		documentText,
		noticeDays,
		papers,
		textDocument,
		type Notice,
		type Paper
	} from '$lib/notices';
	import { getApp, Task } from './state.svelte';
	import { alert, button, field, formText, paperClass, surface } from './ui';

	// A notice's text, classrooms, paper, and days, to post or change. Teachers post to their own classrooms
	// and admins to any. The text is plain until the rich editor takes its place (next-step-plan.md).
	let { locale, notice, onsaved }: { locale: Locale; notice?: Notice; onsaved: () => void } =
		$props();

	const app = getApp();
	const t = $derived(messages[locale].app);
	const task = new Task();
	const day = 24 * 60 * 60 * 1000;
	const classrooms = $derived(
		app.admin
			? app.catalog.classrooms
			: app.catalog.classrooms.filter(({ id }) => app.me?.classrooms.includes(id))
	);
	/** How long the notice is up for now, or the default for a new one. */
	const days = $derived(
		notice ? Math.round((notice.expiresAt - notice.postedAt) / day) : defaultNoticeDays
	);

	function submit(event: SubmitEvent & { currentTarget: EventTarget & HTMLFormElement }) {
		event.preventDefault();
		const form = new FormData(event.currentTarget);
		const text = formText(form, 'text');
		const chosen = form.getAll('classroom').map(String);
		if (!text) task.error = 'empty-notice';
		else if (!chosen.length) task.error = 'no-classrooms';
		else {
			const values = {
				classrooms: chosen,
				paper: String(form.get('paper')) as Paper,
				days: Number(form.get('days')),
				body: textDocument(text),
				announce: form.has('announce')
			};
			task.run(async () => {
				await app.saveNotice(values, notice);
				onsaved();
			});
		}
	}
</script>

{#if classrooms.length}
	<form class="{surface} grid gap-6" onsubmit={submit}>
		<label class={field.label}>
			<span class={field.name}>{t.notices.text}</span>
			<textarea
				class="{field.input} min-h-40"
				name="text"
				rows="6"
				value={notice ? documentText(notice.body) : ''}></textarea>
		</label>
		<fieldset class="grid gap-3">
			<legend class="mb-2 font-semibold">{t.notices.classrooms}</legend>
			{#each classrooms as classroom (classroom.id)}
				<label class="flex items-center gap-3">
					<input
						class={field.check}
						type="checkbox"
						name="classroom"
						value={classroom.id}
						checked={notice ? notice.classrooms.includes(classroom.id) : classrooms.length === 1}
					/>{classroom.name}
				</label>
			{/each}
		</fieldset>
		<fieldset>
			<legend class="mb-3 font-semibold">{t.notices.paper}</legend>
			<div class="flex flex-wrap gap-3">
				{#each papers as paper (paper)}
					<label
						class="size-12 cursor-pointer rounded-2xl ring-1 ring-ink/15 has-checked:ring-3 has-checked:ring-accent has-focus-visible:outline-3 has-focus-visible:outline-offset-4 has-focus-visible:outline-accent {paperClass[
							paper
						]}"
						title={t.notices.papers[paper]}
					>
						<input
							class="sr-only"
							type="radio"
							name="paper"
							value={paper}
							checked={(notice?.paper ?? 'white') === paper}
						/>
						<span class="sr-only">{t.notices.papers[paper]}</span>
					</label>
				{/each}
			</div>
		</fieldset>
		<label class={field.label}>
			<span class={field.name}>{t.notices.days}</span>
			<select class={field.input} name="days">
				{#each noticeDays as count (count)}
					<option value={count} selected={count === days}>{t.notices.dayCount(count)}</option>
				{/each}
			</select>
		</label>
		{#if notice}
			<label class="flex items-start gap-3">
				<input class="{field.check} mt-0.5" type="checkbox" name="announce" />
				<span>
					<span class="block font-semibold">{t.notices.announce}</span>
					<span class={field.hint}>{t.notices.announceHint}</span>
				</span>
			</label>
		{/if}
		{#if task.error}<p class={alert} role="alert">{errorMessage(locale, task.error)}</p>{/if}
		<button class="{button.primary} justify-self-start" type="submit" disabled={task.busy}>
			{task.busy ? t.actions.working : notice ? t.notices.save : t.notices.post}
		</button>
	</form>
{:else}
	<p class="text-muted">{t.notices.noClassrooms}</p>
{/if}
