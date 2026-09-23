<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { createId } from '$lib/crypto';
	import type { NewFile, NoticeFile } from '$lib/files';
	import { errorMessage, messages, type Locale } from '$lib/i18n';
	import {
		day,
		defaultNoticeDays,
		maxOptionLength,
		maxPollOptions,
		minPollOptions,
		type Notice,
		type Paper,
		type PollOption
	} from '$lib/notices';
	import { tick, untrack } from 'svelte';
	import AttachFiles from './AttachFiles.svelte';
	import CheckCard from './CheckCard.svelte';
	import Checklist from './Checklist.svelte';
	import DaysChoice from './DaysChoice.svelte';
	import LeaveGuard from './LeaveGuard.svelte';
	import NoticeEditor from './NoticeEditor.svelte';
	import { getApp, Task } from './state.svelte';
	import { alert, button, field, surface } from './ui';

	// A notice's text on its paper, poll, files, classrooms, and days, to post or change. Teachers post to their
	// own classrooms. The editor's toolbar chooses the paper, which it shows the text on.
	let { locale, notice, onsaved }: { locale: Locale; notice?: Notice; onsaved: () => void } =
		$props();

	const app = getApp();
	const t = $derived(messages[locale].app);
	const id = $props.id();
	const task = new Task();
	const fileTask = new Task();
	const classrooms = $derived(app.myClassrooms);

	/** A new answer for the poll. It keeps its ID when its words change, and with it the votes for it. */
	const blankOption = (): PollOption => ({ id: createId(), text: '' });

	/**
	 * What the form starts with: the notice as it is, or a new notice's defaults. The edit page mounts a new
	 * form for each notice, and reading the notice in here, once, tells Svelte that's intended.
	 */
	function starting() {
		const own = classrooms.map((classroom) => classroom.id);
		return {
			paper: notice?.paper ?? 'white',
			days: notice ? Math.round((notice.expiresAt - notice.postedAt) / day) : defaultNoticeDays,
			// Someone with a single classroom posts to it, and the form keeps it ticked.
			chosen:
				own.length === 1
					? own
					: (notice?.classrooms.filter((classroom) => own.includes(classroom)) ?? []),
			polling: notice?.poll !== undefined,
			counting: notice?.poll?.key !== undefined,
			answered: (notice?.votes.length ?? 0) > 0,
			options: notice?.poll?.options.map((option) => ({ ...option })) ?? [
				blankOption(),
				blankOption()
			],
			files: notice?.files ?? [],
			// The ID the notice posts under, the same however often saving is tried.
			id: notice?.id ?? createId()
		};
	}
	const start = starting();
	let paper = $state<Paper>(start.paper);
	let days = $state(start.days);
	let chosen = $state(start.chosen);
	let announce = $state(false);
	let polling = $state(start.polling);
	/** Whether families see how many chose each answer. */
	let counting = $state(start.counting);
	let options = $state(start.options);
	let optionInputs = $state<HTMLInputElement[]>([]);
	/** The files the notice carries already, and those made ready to attach. */
	let files = $state.raw<(NoticeFile | NewFile)[]>(start.files);
	let editor = $state<ReturnType<typeof NoticeEditor>>();
	let ready = $state(false);
	/** What the form held once the editor opened, to tell whether leaving loses anything. */
	let opened: string | undefined;
	let guard = $state<ReturnType<typeof LeaveGuard>>();

	/** Everything the form holds, as one string to compare. */
	function held() {
		const body = editor?.getDocument() ?? null;
		const answers = options.map(({ id, text }) => [id, text]);
		const ids = files.map((file) => file.id);
		return JSON.stringify([body, paper, days, chosen, announce, polling, counting, answers, ids]);
	}

	$effect(() => {
		if (ready) opened ??= untrack(held);
	});

	/** Whether saving clears the answers given: families would see the counts, or stop seeing them. */
	const clearsAnswers = $derived(
		start.answered && start.polling && polling && counting !== start.counting
	);

	async function addOption() {
		options.push(blankOption());
		await tick();
		optionInputs[options.length - 1]?.focus();
	}

	/** Enter in an answer goes on to the next one, adding one at the end, instead of posting the notice. */
	function nextOption(event: KeyboardEvent, index: number) {
		if (event.key !== 'Enter' || event.isComposing) return;
		event.preventDefault();
		if (index < options.length - 1) optionInputs[index + 1]?.focus();
		else if (options.length < maxPollOptions) addOption();
	}

	function submit(event: SubmitEvent) {
		event.preventDefault();
		const body = editor?.getDocument();
		// Answers left empty are dropped.
		const answers = options
			.map((option) => ({ id: option.id, text: option.text.trim() }))
			.filter((option) => option.text);
		if (!editor || editor.isEmpty()) task.error = 'empty-notice';
		else if (!body) task.error = 'notice-too-long';
		else if (polling && answers.length < minPollOptions) task.error = 'poll-answers';
		else if (!chosen.length) task.error = 'no-classrooms';
		else {
			const poll = polling ? { options: answers, counts: counting } : undefined;
			const values = { classrooms: [...chosen], paper, days, body, announce, poll, files };
			task.run(async () => {
				await app.saveNotice(start.id, values, notice);
				guard?.release();
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
				bind:paper
			/>
		</div>

		<div class="grid gap-3">
			<CheckCard label={t.polls.add} hint={t.polls.addHint} bind:checked={polling} />
			{#if polling}
				<div class="grid gap-2" role="group" aria-label={t.polls.answers}>
					{#each options as option, index (option.id)}
						<div class="flex items-center gap-2">
							<input
								bind:this={optionInputs[index]}
								bind:value={option.text}
								class="{field.input} min-w-0"
								aria-label={t.polls.answer(index + 1)}
								placeholder={t.polls.answer(index + 1)}
								maxlength={maxOptionLength}
								autocomplete="off"
								onkeydown={(event) => nextOption(event, index)}
							/>
							{#if options.length > minPollOptions}
								<button
									class={button.icon}
									type="button"
									aria-label={t.polls.removeAnswer(index + 1)}
									onclick={() => options.splice(index, 1)}
								>
									<Icon name="x" />
								</button>
							{/if}
						</div>
					{/each}
					{#if options.length < maxPollOptions}
						<button
							class="{button.quiet} -ml-3 justify-self-start"
							type="button"
							onclick={addOption}
						>
							<Icon name="plus" class="size-4" />{t.polls.addAnswer}
						</button>
					{/if}
				</div>
				<CheckCard label={t.polls.counts} hint={t.polls.countsHint} bind:checked={counting} />
				{#if clearsAnswers}<p class={field.hint}>{t.polls.countsChanging}</p>{/if}
			{:else if notice?.poll}
				<p class={field.hint}>{t.polls.removing}</p>
			{/if}
		</div>

		<AttachFiles {locale} task={fileTask} disabled={task.busy} bind:files />

		<Checklist
			{locale}
			label={t.notices.classrooms}
			options={classrooms.map((classroom) => ({ value: classroom.id, label: classroom.name }))}
			disabled={classrooms.length === 1}
			bind:chosen
		/>

		<DaysChoice {locale} legend={t.notices.days} from={notice?.postedAt} bind:days />

		{#if notice}
			<CheckCard label={t.notices.announce} hint={t.notices.announceHint} bind:checked={announce} />
		{/if}
		{#if task.error}<p class={alert} role="alert">{errorMessage(locale, task.error)}</p>{/if}
		<button
			class="{button.primary} justify-self-start"
			type="submit"
			disabled={task.busy || fileTask.busy || !ready}
		>
			{task.busy ? t.actions.working : notice ? t.notices.save : t.notices.post}
		</button>
	</form>
{:else}
	<p class="text-muted">{t.notices.noClassrooms}</p>
{/if}

<!-- While saving, the page stays until the notice is up; the notice would be lost with it otherwise. -->
<LeaveGuard
	bind:this={guard}
	{locale}
	{...t.leaveForm}
	ask={() => opened !== undefined && held() !== opened}
	hold={() => task.busy}
/>
