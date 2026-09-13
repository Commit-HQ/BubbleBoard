<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { errorMessage, listNames, messages, type Locale } from '$lib/i18n';
	import type { Family } from '$lib/kindergarten';
	import type { Notice, Poll, PollOption } from '$lib/notices';
	import { getApp, Task } from './state.svelte';
	import { alert, button, choice } from './ui';

	// A notice's poll. A family ticks an answer and confirms it, then sees the answer it gave, which it can
	// change. Staff see how many of the notice's families chose each answer, who they are, and who hasn't
	// answered yet. A poll with a key shows families how many chose each answer too, but never who.
	let {
		locale,
		notice,
		poll,
		families
	}: {
		locale: Locale;
		notice: Notice;
		poll: Poll;
		/** On a staff device, the families the notice is for. */
		families: Family[];
	} = $props();
	const app = getApp();
	const t = $derived(messages[locale].app.polls);
	const actions = $derived(messages[locale].app.actions);
	const id = $props.id();
	const task = new Task();
	const counted = $derived(poll.key !== undefined);
	/** The answer this device's family gave. */
	const given = $derived(poll.options.find((option) => option.id === app.myVote(notice)));
	/** Whether the family is choosing another answer in place of the one it gave. */
	let changing = $state(false);
	/** The answer ticked, until it's confirmed. */
	let ticked = $state<string>();

	/** The option each family chose, by family. */
	const answers = $derived(new Map(notice.votes.map((vote) => [vote.family, vote.option])));
	/** On a staff device, each option with the names of the notice's families that chose it. */
	const named = $derived(
		poll.options.map((option) => {
			const names = families
				.filter(({ id }) => answers.get(id) === option.id)
				.map(({ name }) => name);
			return { option, count: names.length, names };
		})
	);
	/** On a family device, each option with how many families chose it. */
	const counts = $derived(
		poll.options.map((option) => ({
			option,
			count: notice.votes.filter((vote) => vote.option === option.id).length,
			names: []
		}))
	);
	const unanswered = $derived(families.filter(({ id }) => !answers.has(id)));

	function change() {
		ticked = given?.id;
		changing = true;
	}

	function cancel() {
		ticked = undefined;
		changing = false;
		task.error = undefined;
	}

	function confirm(event: SubmitEvent) {
		event.preventDefault();
		const option = ticked;
		if (!option) return;
		task.run(async () => {
			// Confirming the answer given already changes nothing.
			if (option !== given?.id) await app.vote(notice, option);
			ticked = undefined;
			changing = false;
		});
	}
</script>

{#snippet results(rows: { option: PollOption; count: number; names: string[] }[], total: number)}
	<ul class="grid gap-3">
		{#each rows as { option, count, names } (option.id)}
			<li>
				<p class="flex items-baseline justify-between gap-3">
					<span class="font-semibold">{option.text}</span>
					<span class="shrink-0 text-sm font-semibold text-muted">{t.votes(count)}</span>
				</p>
				<!-- A bar is drawn with SVG attributes, which the CSP allows where inline styles aren't. -->
				<svg class="mt-1.5 h-2 w-full rounded-full" aria-hidden="true">
					<rect width="100%" height="100%" rx="4" class="fill-ink/10" />
					<rect
						width="{total ? Math.round((count / total) * 100) : 0}%"
						height="100%"
						rx="4"
						class="fill-accent"
					/>
				</svg>
				{#if names.length}<p class="mt-1 text-sm text-muted">{listNames(locale, names)}</p>{/if}
			</li>
		{/each}
	</ul>
{/snippet}

{#if app.status === 'family'}
	{#if given && !changing}
		<section class="grid justify-items-start gap-3" aria-labelledby="{id}-title">
			<p id="{id}-title" class="flex items-center gap-2 font-semibold">
				<Icon name="check" class="size-4 shrink-0" />{t.yours(given.text)}
			</p>
			{#if counted}
				<div class="w-full">{@render results(counts, notice.votes.length)}</div>
			{/if}
			<p class="text-sm text-muted">{counted ? t.counted : t.private}</p>
			<button class={button.secondary} type="button" onclick={change}>
				<Icon name="pencil" class="size-4" />{t.change}
			</button>
		</section>
	{:else}
		<form class="grid gap-3" onsubmit={confirm}>
			<fieldset>
				<legend class="mb-2 text-sm font-semibold">{t.choose}</legend>
				<div class="grid gap-2">
					{#each poll.options as option (option.id)}
						<label class={choice.card}>
							<input
								class="sr-only"
								type="radio"
								name="{id}-answer"
								value={option.id}
								checked={ticked === option.id}
								onchange={() => (ticked = option.id)}
							/>
							<span class={choice.circle}><Icon name="check" class={choice.check} /></span>
							<span class="font-semibold">{option.text}</span>
						</label>
					{/each}
				</div>
			</fieldset>
			<p class="text-sm text-muted">{counted ? t.counted : t.private}</p>
			{#if task.error}<p class={alert} role="alert">{errorMessage(locale, task.error)}</p>{/if}
			<div class="flex flex-wrap gap-2">
				<button class={button.primary} type="submit" disabled={!ticked || task.busy}>
					<Icon name="check" class="size-4" />{task.busy ? actions.working : t.confirm}
				</button>
				{#if given}
					<button class={button.quiet} type="button" onclick={cancel}>{actions.cancel}</button>
				{/if}
			</div>
		</form>
	{/if}
{:else}
	<section class="grid gap-3" aria-labelledby="{id}-title">
		<div>
			<p id="{id}-title" class="text-sm font-semibold">{t.title}</p>
			{#if counted}<p class="text-sm text-muted">{t.countsShown}</p>{/if}
		</div>
		{@render results(named, families.length)}
		{#if unanswered.length}
			<p class="text-sm">{t.noAnswer(unanswered.map(({ name }) => name))}</p>
		{/if}
	</section>
{/if}
