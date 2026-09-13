<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { errorMessage, listNames, messages, type Locale } from '$lib/i18n';
	import type { Family } from '$lib/kindergarten';
	import type { Notice, Poll } from '$lib/notices';
	import { getApp, Task } from './state.svelte';
	import { alert, choice } from './ui';

	// A notice's poll. A family answers with a tap and can change its answer, which only staff see. Staff see
	// how many of the notice's families chose each answer, who they are, and who hasn't answered yet.
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
	const id = $props.id();
	const task = new Task();
	/** The answer being sent, shown as chosen until it's saved or fails. */
	let sending = $state<string>();
	const chosen = $derived(sending ?? app.myVote(notice));

	/** The option each family chose, by family. */
	const answers = $derived(new Map(notice.votes.map((vote) => [vote.family, vote.option])));
	const results = $derived(
		poll.options.map((option) => ({
			option,
			names: families.filter(({ id }) => answers.get(id) === option.id).map(({ name }) => name)
		}))
	);
	const unanswered = $derived(families.filter(({ id }) => !answers.has(id)));

	/** How much of the bar under an answer fills: the share of the notice's families that chose it. */
	function share(count: number) {
		return families.length ? Math.round((count / families.length) * 100) : 0;
	}

	async function answer(option: string) {
		if (task.busy || option === chosen) return;
		sending = option;
		await task.run(() => app.vote(notice, option));
		sending = undefined;
	}
</script>

{#if app.status === 'family'}
	<div class="grid gap-2" role="group" aria-labelledby="{id}-title">
		<p id="{id}-title" class="text-sm font-semibold">{t.choose}</p>
		{#each poll.options as option (option.id)}
			<button
				class={choice.card}
				type="button"
				aria-pressed={chosen === option.id}
				onclick={() => answer(option.id)}
			>
				<span class={choice.circle}><Icon name="check" class={choice.check} /></span>
				<span class="font-semibold">{option.text}</span>
			</button>
		{/each}
		<p class="text-sm text-muted">{t.private}</p>
		{#if task.error}<p class={alert} role="alert">{errorMessage(locale, task.error)}</p>{/if}
	</div>
{:else}
	<section class="grid gap-3" aria-labelledby="{id}-title">
		<p id="{id}-title" class="text-sm font-semibold">{t.title}</p>
		<ul class="grid gap-3">
			{#each results as { option, names } (option.id)}
				<li>
					<p class="flex items-baseline justify-between gap-3">
						<span class="font-semibold">{option.text}</span>
						<span class="shrink-0 text-sm font-semibold text-muted">{t.votes(names.length)}</span>
					</p>
					<!-- A bar is drawn with SVG attributes, which the CSP allows where inline styles aren't. -->
					<svg class="mt-1.5 h-2 w-full rounded-full" aria-hidden="true">
						<rect width="100%" height="100%" rx="4" class="fill-ink/10" />
						<rect width="{share(names.length)}%" height="100%" rx="4" class="fill-accent" />
					</svg>
					{#if names.length}<p class="mt-1 text-sm text-muted">{listNames(locale, names)}</p>{/if}
				</li>
			{/each}
		</ul>
		{#if unanswered.length}
			<p class="text-sm">{t.noAnswer(unanswered.map(({ name }) => name))}</p>
		{/if}
	</section>
{/if}
