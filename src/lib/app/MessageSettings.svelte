<script lang="ts">
	import { untrack } from 'svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { errorMessage, messages, type Locale } from '$lib/i18n';
	import { defaultSchedule, type MessageSettings } from '$lib/messages';
	import { getApp, Task } from './state.svelte';
	import { alert, button, choice, field, labelFocus, surface } from './ui';

	// What an admin decides about a classroom's parent messaging: whether families may write at all, how many
	// inquiries each family has a month, and the hours their messages go through. Teachers are never held to
	// any of it. It opens from the classroom's page, where it stays out of the way until asked for.
	let {
		locale,
		settings,
		onclose
	}: { locale: Locale; settings: MessageSettings; onclose: () => void } = $props();
	const app = getApp();
	const t = $derived(messages[locale].app.messaging);
	/** The week as the form holds it: every day has times, and a switch saying whether it's open. */
	const weekOf = ({ schedule }: MessageSettings) =>
		schedule.map((day, index) => ({ active: !!day, ...(day ?? defaultSchedule()[index]!) }));

	let enabled = $state(untrack(() => settings.enabled));
	let limit = $state(untrack(() => settings.monthlyLimit));
	let schedule = $state(untrack(() => weekOf(settings)));
	let revision = $state(untrack(() => settings.revision));
	const task = new Task();
	let saved = $state(false);

	async function save(event: SubmitEvent) {
		event.preventDefault();
		saved = false;
		// A time field lets the same time stand at both ends of a day, which is no interval at all: the server
		// refuses it, so the form says which way round it goes instead of sending it.
		if (schedule.some((day) => day.active && day.start >= day.end)) {
			task.error = 'messages-schedule';
			return;
		}
		await task.run(async () => {
			await app.saveMessageSettings({
				classroom: settings.classroom,
				enabled,
				monthlyLimit: limit,
				revision,
				schedule: schedule.map(({ active, start, end }) => (active ? { start, end } : null))
			});
			revision++;
			saved = true;
		});
		// Another admin got there first: the reload above brought their week in through `settings`, so the
		// form shows it and can be saved again.
		if (task.error === 'stale') {
			enabled = settings.enabled;
			limit = settings.monthlyLimit;
			revision = settings.revision;
			schedule = weekOf(settings);
		}
	}
</script>

<form class="{surface} grid gap-5" onsubmit={save}>
	<fieldset disabled={task.busy} class="grid gap-5">
		<label class={choice.card}>
			<input class="sr-only" type="checkbox" bind:checked={enabled} />
			<span class={choice.box}><Icon name="check" class={choice.check} /></span>
			<span class="font-semibold">{t.enabled}</span>
		</label>
		<label class={field.label}>
			<span class={field.name}>{t.limit}</span>
			<input
				class="{field.input} max-w-28"
				type="number"
				inputmode="numeric"
				min="1"
				max="1000"
				required
				bind:value={limit}
			/>
			<span class={field.hint}>{t.limitHint}</span>
		</label>
		<div class="grid gap-2">
			<p class={field.name}>{t.schedule}</p>
			<!-- A week in five rows: each day is a line with its switch and, when it's open, the two times
			beside it. Narrow screens shorten the day's name, and take the times to a line of their own. -->
			<div class="rounded-2xl bg-white/50 px-4">
				{#each schedule as day, index (index)}
					<div
						class="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-ink/10 py-1 first:border-t-0"
					>
						<label class="group flex min-h-11 grow cursor-pointer items-center gap-3 {labelFocus}">
							<input class="sr-only" type="checkbox" bind:checked={day.active} />
							<span class={choice.box}><Icon name="check" class={choice.check} /></span>
							<span class="font-semibold">
								<span class="sm:hidden">{t.daysShort[index]}</span>
								<span class="max-sm:hidden">{t.days[index]}</span>
							</span>
							{#if !day.active}<span class="text-sm text-muted">{t.offDay}</span>{/if}
						</label>
						{#if day.active}
							<div class="flex items-center gap-1.5">
								<input
									aria-label={`${t.days[index]} ${t.fromTime}`}
									class={field.time}
									type="time"
									required
									bind:value={day.start}
								/>
								<span class="text-muted" aria-hidden="true">–</span>
								<input
									aria-label={`${t.days[index]} ${t.toTime}`}
									class={field.time}
									type="time"
									required
									min={day.start}
									bind:value={day.end}
								/>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		</div>
		<div class="flex flex-wrap gap-2">
			<button class={button.primary} type="submit">{t.save}</button>
			<button class={button.quiet} type="button" onclick={onclose}>{t.done}</button>
		</div>
	</fieldset>
	{#if task.error}<p class={alert} role="alert">{errorMessage(locale, task.error)}</p>{/if}
	{#if saved}<p class="font-semibold text-muted" role="status">{t.saved}</p>{/if}
</form>
