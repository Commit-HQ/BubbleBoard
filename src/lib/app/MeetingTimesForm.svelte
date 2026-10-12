<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { errorMessage, messages, type Locale } from '$lib/i18n';
	import {
		meetingDay,
		meetingTime,
		meetingTimestamp,
		nextMeetingTime,
		type MeetingSlot
	} from '$lib/meetings';
	import { messageClock } from '$lib/messages';
	import { getApp, Task } from './state.svelte';
	import { alert, button, field, surface } from './ui';
	/**
	 * The times of one day, each set on its own: a new offer, or an offer's times (`day`), whose booked times and
	 * times that started stay as they are.
	 */
	let {
		locale,
		now,
		day,
		ondone,
		onclose
	}: {
		locale: Locale;
		now: number;
		day?: MeetingSlot[];
		ondone: (notice: string) => void;
		onclose: () => void;
	} = $props();
	const app = getApp(),
		task = new Task();
	const t = $derived(messages[locale].app.meetings);
	type Row = { key: string; from: string; to: string; slot?: MeetingSlot };
	let key = 0;
	// The form keeps what it was opened with, while the list under it reloads.
	// svelte-ignore state_referenced_locally
	const opened = day;
	let classroom = $state(''),
		date = $state(opened ? messageClock(opened[0].start).date : '');
	let rows = $state<Row[]>(
		opened
			? opened.map((slot) => ({
					key: slot.id,
					from: messageClock(slot.start).time,
					to: messageClock(slot.end).time,
					slot
				}))
			: [{ key: String(key++), ...nextMeetingTime()! }]
	);
	const chosenClassroom = $derived(classroom || app.myClassrooms[0]?.id || '');
	const hasChildren = $derived(
		!!opened || app.catalog.children.some((c) => c.classroom === chosenClassroom)
	);
	/** A booked time, or one that started, stays as it is. */
	const fixed = (row: Row, at: number) => !!row.slot && (row.slot.booked || row.slot.start <= at);
	const times = $derived(
		rows.map((row) =>
			row.slot && fixed(row, now)
				? { start: row.slot.start, end: row.slot.end }
				: { start: meetingTimestamp(date, row.from), end: meetingTimestamp(date, row.to) }
		)
	);
	/** What's wrong with each row, if anything. */
	const problems = $derived(
		rows.map((row, i) => {
			const { start, end } = times[i];
			if (fixed(row, now) || !date) return '';
			if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return t.rowOrder;
			if (end - start < 5 * 60000 || end - start > 120 * 60000) return t.rowLength;
			if (start <= now) return t.rowPast;
			return times.some((other, j) => j !== i && other.start < end && other.end > start)
				? t.rowOverlap
				: '';
		})
	);
	const valid = $derived(!!date && rows.length > 0 && problems.every((problem) => !problem));
	const next = $derived(nextMeetingTime(rows.at(-1)));
	const add = () => next && (rows = [...rows, { key: String(key++), ...next }]);
	async function save() {
		if (!valid || !hasChildren) return;
		// The clock now, not the one the form last read, so a time that just started isn't sent as offered.
		const at = Date.now();
		const free = rows
			.map((row, i) => ({ row, ...times[i] }))
			.filter(({ row }) => !fixed(row, at))
			.sort((a, b) => a.start - b.start);
		if (!opened) {
			await app.publishMeetings(
				chosenClassroom,
				free.map(({ start, end }) => ({ start, end }))
			);
			ondone(t.success);
			return;
		}
		await app.changeMeetingTimes(
			opened[0].offer,
			opened,
			free.map(({ row, start, end }) => ({
				// A time whose clock is the same keeps its ID, so a parent looking at it can still book it.
				id: row.slot?.start === start && row.slot.end === end ? row.slot.id : undefined,
				start,
				end
			}))
		);
		ondone(t.saved);
	}
</script>

<form
	class="{surface} grid gap-5"
	onsubmit={(event) => {
		event.preventDefault();
		void task.run(save);
	}}
>
	<div>
		<h2 class="text-2xl">{opened ? t.edit : t.offer}</h2>
		{#if opened}<p class="mt-1 font-semibold">{meetingDay(locale, opened[0].start)}</p>{/if}
		<p class="mt-1 text-muted">{opened ? t.editHint : t.hint}</p>
	</div>
	<fieldset disabled={task.busy} class="grid min-w-0 gap-5">
		{#if !opened}
			{#if app.myClassrooms.length > 1}<label class={field.label}
					><span class={field.name}>{t.classroom}</span><select
						class={field.input}
						value={chosenClassroom}
						onchange={(e) => (classroom = e.currentTarget.value)}
						>{#each app.myClassrooms as c (c.id)}<option value={c.id}>{c.name}</option
							>{/each}</select
					></label
				>{/if}
			<label class={field.label}
				><span class={field.name}>{t.date}</span><input
					class={field.input}
					type="date"
					bind:value={date}
					min={messageClock(now).date}
					max={messageClock(now + 365 * 86400000).date}
					required
				/></label
			>
		{/if}
		<fieldset class="grid min-w-0 gap-2">
			<legend class="mb-2 font-semibold">{t.times}</legend>
			{#each rows as row, i (row.key)}
				{#if row.slot && fixed(row, now)}
					<div class="flex min-h-12 items-center gap-2 rounded-2xl bg-ink/5 p-3 text-sm">
						<Icon name="lock" class="size-4 shrink-0 text-muted" />
						<span class="font-semibold"
							>{meetingTime(locale, row.slot.start)}–{meetingTime(locale, row.slot.end)}</span
						>
						<span class="text-muted"
							>{#if row.slot.booked}{t.booked}{/if}{#if app.catalog.children.find((c) => c.id === row.slot?.child)}
								· {app.catalog.children.find((c) => c.id === row.slot?.child)?.name}{/if}</span
						>
					</div>
				{:else}
					<div>
						<div class="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2">
							<input
								class={field.input}
								type="time"
								aria-label={t.start}
								aria-invalid={!!problems[i]}
								bind:value={row.from}
								required
							/>
							<span aria-hidden="true">–</span>
							<input
								class={field.input}
								type="time"
								aria-label={t.end}
								aria-invalid={!!problems[i]}
								bind:value={row.to}
								required
							/>
							<button
								type="button"
								class="{button.icon} hover:bg-red-50 hover:text-red-700"
								title={t.remove}
								aria-label={t.remove}
								onclick={() => (rows = rows.filter((other) => other !== row))}
							>
								<Icon name="x" />
							</button>
						</div>
						{#if problems[i]}<p class="mt-1 text-sm text-red-800">{problems[i]}</p>{/if}
					</div>
				{/if}
			{/each}
			{#if !rows.length}<p class="text-sm text-muted">{t.noTimes}</p>{/if}
			<div>
				<button type="button" class={button.secondary} disabled={!next} onclick={add}
					><Icon name="plus" class="size-4" />{t.addTime}</button
				>
			</div>
		</fieldset>
		{#if !hasChildren}<p class={alert}>{t.noChildren}</p>{/if}
	</fieldset>
	{#if task.error}<p class={alert} role="alert">{errorMessage(locale, task.error)}</p>{/if}
	<div class="flex flex-wrap gap-2">
		<button class={button.primary} disabled={task.busy || !valid || !hasChildren}
			>{task.busy ? (opened ? t.saving : t.publishing) : opened ? t.save : t.publish}</button
		><button type="button" class={button.quiet} disabled={task.busy} onclick={onclose}
			>{t.cancel}</button
		>
	</div>
</form>
