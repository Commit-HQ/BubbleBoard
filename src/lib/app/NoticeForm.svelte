<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { errorMessage, messages, type Locale } from '$lib/i18n';
	import { defaultNoticeDays, noticeDays, papers, type Notice, type Paper } from '$lib/notices';
	import NoticeEditor from './NoticeEditor.svelte';
	import { getApp, Task } from './state.svelte';
	import { alert, button, choice, field, paperClass, surface } from './ui';

	// A notice's text, classrooms, paper, and days, to post or change. Teachers post to their own classrooms
	// and admins to any. The editor shows the text on the paper chosen for it.
	let { locale, notice, onsaved }: { locale: Locale; notice?: Notice; onsaved: () => void } =
		$props();

	const app = getApp();
	const t = $derived(messages[locale].app);
	const id = $props.id();
	const task = new Task();
	const day = 24 * 60 * 60 * 1000;
	const classrooms = $derived(app.myClassrooms);

	/** What the form starts with: the notice as it is, or a new notice's defaults. The edit page mounts a new form for each notice. */
	function starting() {
		const own = app.myClassrooms.map((classroom) => classroom.id);
		return {
			paper: notice?.paper ?? 'white',
			days: notice ? Math.round((notice.expiresAt - notice.postedAt) / day) : defaultNoticeDays,
			// Someone with a single classroom posts to it.
			chosen: notice
				? notice.classrooms.filter((classroom) => own.includes(classroom))
				: own.length === 1
					? own
					: []
		};
	}
	const start = starting();
	let paper = $state<Paper>(start.paper);
	let days = $state(start.days);
	let chosen = $state(start.chosen);
	let announce = $state(false);
	let editor = $state<ReturnType<typeof NoticeEditor>>();
	let ready = $state(false);

	const allChosen = $derived(classrooms.every((classroom) => chosen.includes(classroom.id)));
	/** When the notice comes down: its days count from when it was first posted. */
	const until = $derived(
		new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long' }).format(
			(notice?.postedAt ?? Date.now()) + days * day
		)
	);

	function submit(event: SubmitEvent) {
		event.preventDefault();
		const body = editor?.getDocument();
		if (!editor || editor.isEmpty()) task.error = 'empty-notice';
		else if (!body) task.error = 'notice-too-long';
		else if (!chosen.length) task.error = 'no-classrooms';
		else {
			const values = { classrooms: [...chosen], paper, days, body, announce };
			task.run(async () => {
				await app.saveNotice(values, notice);
				onsaved();
			});
		}
	}
</script>

{#if classrooms.length}
	<form class="{surface} grid gap-7" onsubmit={submit}>
		<div class="grid gap-1.5">
			<span id="{id}-text" class={field.name}>{t.notices.text}</span>
			<NoticeEditor
				bind:this={editor}
				bind:ready
				{locale}
				content={notice?.body}
				labelledby="{id}-text"
				paper={paperClass[paper]}
			/>
		</div>

		<fieldset>
			<legend class="mb-3 font-semibold">{t.notices.paper}</legend>
			<div class="flex flex-wrap gap-3">
				{#each papers as option (option)}
					<label
						class="size-12 cursor-pointer rounded-2xl ring-1 ring-ink/15 has-checked:ring-3 has-checked:ring-accent has-focus-visible:outline-3 has-focus-visible:outline-offset-4 has-focus-visible:outline-accent {paperClass[
							option
						]}"
						title={t.notices.papers[option]}
					>
						<input class="sr-only" type="radio" value={option} bind:group={paper} />
						<span class="sr-only">{t.notices.papers[option]}</span>
					</label>
				{/each}
			</div>
		</fieldset>

		<div class="grid gap-3" role="group" aria-labelledby="{id}-classrooms">
			<div class="flex flex-wrap items-center justify-between gap-x-4">
				<span id="{id}-classrooms" class="font-semibold">{t.notices.classrooms}</span>
				{#if classrooms.length > 1}
					<label
						class="group inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full font-semibold text-muted transition-colors hover:text-ink has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent"
					>
						<input
							class="sr-only"
							type="checkbox"
							checked={allChosen}
							onchange={(event) =>
								(chosen = event.currentTarget.checked
									? classrooms.map((classroom) => classroom.id)
									: [])}
						/>
						<span class={choice.box}><Icon name="check" class={choice.check} /></span>
						{t.notices.selectAll}
					</label>
				{/if}
			</div>
			<div class="grid gap-2 sm:grid-cols-2">
				{#each classrooms as classroom (classroom.id)}
					<label class={choice.card}>
						<input class="sr-only" type="checkbox" value={classroom.id} bind:group={chosen} />
						<span class={choice.box}><Icon name="check" class={choice.check} /></span>
						<span class="min-w-0 font-semibold">{classroom.name}</span>
					</label>
				{/each}
			</div>
		</div>

		<fieldset>
			<legend class="mb-3 font-semibold">{t.notices.days}</legend>
			<div class="grid grid-cols-4 gap-2 sm:grid-cols-7">
				{#each noticeDays as count (count)}
					<!-- Forced colours drop the dark fill, so the chosen number is underlined there instead. -->
					<label
						class="group grid cursor-pointer justify-items-center gap-1 rounded-2xl border border-ink/10 bg-white/60 px-1 py-3 transition hover:bg-white has-checked:border-ink has-checked:bg-ink has-checked:text-white has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent"
					>
						<input class="sr-only" type="radio" name="{id}-days" value={count} bind:group={days} />
						<span class="sr-only">{t.notices.dayCount(count)}</span>
						<span
							class="font-display text-3xl leading-none forced-colors:group-has-checked:underline"
							aria-hidden="true">{count}</span
						>
						<span
							class="text-xs font-semibold text-muted group-has-checked:text-white/80"
							aria-hidden="true">{t.notices.dayUnit(count)}</span
						>
					</label>
				{/each}
			</div>
			<p class="mt-3 text-sm text-muted">{t.notices.until(until)}</p>
		</fieldset>

		{#if notice}
			<label class={choice.card}>
				<input class="sr-only" type="checkbox" bind:checked={announce} />
				<span class={choice.box}><Icon name="check" class={choice.check} /></span>
				<span>
					<span class="block font-semibold">{t.notices.announce}</span>
					<span class={field.hint}>{t.notices.announceHint}</span>
				</span>
			</label>
		{/if}
		{#if task.error}<p class={alert} role="alert">{errorMessage(locale, task.error)}</p>{/if}
		<button
			class="{button.primary} justify-self-start"
			type="submit"
			disabled={task.busy || !ready}
		>
			{task.busy ? t.actions.working : notice ? t.notices.save : t.notices.post}
		</button>
	</form>
{:else}
	<p class="text-muted">{t.notices.noClassrooms}</p>
{/if}
