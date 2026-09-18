<script lang="ts">
	import { onMount } from 'svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { errorMessage, messages, type Locale } from '$lib/i18n';
	import { generateMeetingSlots, meetingDay, meetingTime, type MeetingSlot } from '$lib/meetings';
	import { messageClock } from '$lib/messages';
	import { getApp, Task } from './state.svelte';
	import { alert, button, everyHalfMinute, field, surface } from './ui';
	import ConfirmDialog from './ConfirmDialog.svelte';
	import RefreshButton from './RefreshButton.svelte';
	let { locale }: { locale: Locale } = $props();
	const app = getApp(),
		task = new Task();
	const t = $derived(messages[locale].app.meetings);
	const staff = $derived(app.status === 'staff');
	let now = $state(Date.now()),
		showForm = $state(false),
		classroom = $state('');
	let date = $state(''),
		from = $state('16:00'),
		to = $state('18:00'),
		duration = $state(20);
	let excluded = $state<number[]>([]),
		notice = $state('');
	let selectedChildren = $state<Record<string, string>>({});
	let dayRemoval = $state<MeetingSlot[]>();
	let confirmation = $state<{
		slot: MeetingSlot;
		action: 'book' | 'cancel' | 'remove';
		child?: string;
	}>();
	const chosenClassroom = $derived(classroom || app.myClassrooms[0]?.id || '');
	const preview = $derived(generateMeetingSlots(date, from, to, duration));
	const selected = $derived(preview.filter((s) => !excluded.includes(s.start)));
	const valid = $derived(selected.length > 0 && selected.every((s) => s.start > now));
	const hasChildren = $derived(app.catalog.children.some((c) => c.classroom === chosenClassroom));
	const upcoming = $derived(app.meetings.filter((s) => s.start > now));
	const past = $derived(app.meetings.filter((s) => s.start <= now));
	const groups = (slots: MeetingSlot[]) =>
		Object.values(
			slots.reduce<Record<string, MeetingSlot[]>>((groups, slot) => {
				const key = `${slot.offer}:${messageClock(slot.start).date}`;
				(groups[key] ??= []).push(slot);
				return groups;
			}, {})
		);
	// Grouping reads the clock once per slot, so it happens when the times change, not on every render.
	const upcomingGroups = $derived(groups(upcoming));
	const pastGroups = $derived(groups([...past].reverse()));
	const children = (offer: string) => app.meetingChildren.filter((c) => c.offer === offer);
	const chosenChild = (offer: string) => selectedChildren[offer] || children(offer)[0]?.child;
	const alreadyBooked = (offer: string) =>
		app.meetings.some((s) => s.offer === offer && s.child === chosenChild(offer) && s.mine);
	const canManage = (s: MeetingSlot) => staff && (app.admin || s.teacher === app.me?.id);
	const removableDay = (slot: MeetingSlot) => {
		const day = messageClock(slot.start).date;
		return upcoming.filter(
			(s) => s.classroom === slot.classroom && messageClock(s.start).date === day && canManage(s)
		);
	};
	async function removeDay() {
		if (!dayRemoval?.length) return;
		await app.removeMeetingDay(
			dayRemoval[0].classroom,
			messageClock(dayRemoval[0].start).date,
			dayRemoval
		);
		dayRemoval = undefined;
		notice = t.dayRemoved;
	}

	const childName = (s: MeetingSlot) =>
		staff
			? app.catalog.children.find((c) => c.id === s.child)?.name
			: app.meetingChildren.find((c) => c.offer === s.offer && c.child === s.child)?.name;
	const time = (s: { start: number; end: number }) =>
		`${meetingTime(locale, s.start)}–${meetingTime(locale, s.end)}`;
	onMount(() => void app.loadMeetings());
	everyHalfMinute((visible) => {
		now = Date.now();
		if (visible) void app.loadMeetings();
	});
	function toggle(start: number) {
		excluded = excluded.includes(start)
			? excluded.filter((s) => s !== start)
			: [...excluded, start];
	}
	async function publish() {
		if (!valid || !hasChildren) return;
		await app.publishMeetings(chosenClassroom, selected);
		showForm = false;
		excluded = [];
		notice = t.success;
	}
	/** What each of the three changes is called, asked, and said once it's done. */
	const actions = $derived({
		book: { title: t.reservation, label: t.reserve, copy: t.confirmCopy, done: t.reserved },
		cancel: {
			title: t.cancelBooking,
			label: t.cancelBooking,
			copy: t.cancelCopy,
			// A family cancelling its own meeting sees the list change, which says it plainly enough.
			done: staff ? t.cancelled : ''
		},
		remove: { title: t.remove, label: t.remove, copy: t.removeCopy, done: t.removed }
	});
	async function confirm() {
		if (!confirmation) return;
		const current = confirmation;
		await app.changeMeeting(current.slot, current.action, current.child);
		confirmation = undefined;
		notice = actions[current.action].done;
	}
</script>

<div class="grid gap-6">
	<div class="flex flex-wrap gap-2">
		{#if staff && app.myClassrooms.length}<button
				type="button"
				class={button.primary}
				onclick={() => {
					showForm = !showForm;
					task.error = undefined;
				}}
				aria-expanded={showForm}>{showForm ? t.cancelForm : t.offer}</button
			>{/if}
		<RefreshButton label={t.refresh} onrefresh={() => app.loadMeetings()} />
	</div>
	{#if notice}<p role="status" class="rounded-2xl bg-white/70 p-4 font-semibold">{notice}</p>{/if}
	{#if app.meetingsError}<p class={alert} role="alert">
			{errorMessage(locale, app.meetingsError)}
		</p>{/if}
	{#if showForm && staff}
		<form
			class="{surface} grid gap-5"
			onsubmit={(event) => {
				event.preventDefault();
				void task.run(publish);
			}}
		>
			<h2 class="text-2xl">{t.offer}</h2>
			<p class="text-muted">{t.hint}</p>
			<fieldset disabled={task.busy} class="grid min-w-0 gap-5">
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
						onchange={() => (excluded = [])}
					/></label
				>
				<div class="grid grid-cols-2 gap-3">
					<label class={field.label}
						><span class={field.name}>{t.start}</span><input
							class={field.input}
							type="time"
							bind:value={from}
							required
							onchange={() => (excluded = [])}
						/></label
					>
					<label class={field.label}
						><span class={field.name}>{t.end}</span><input
							class={field.input}
							type="time"
							bind:value={to}
							required
							onchange={() => (excluded = [])}
						/></label
					>
				</div>
				<label class={field.label}
					><span class={field.name}>{t.duration}</span><select
						class={field.input}
						bind:value={duration}
						onchange={() => (excluded = [])}
						>{#each [10, 15, 20, 30, 45, 60] as n}<option value={n}>{n} {t.minutes}</option
							>{/each}</select
					></label
				>
				{#if !hasChildren}<p class={alert}>{t.noChildren}</p>{/if}
				{#if preview.length}
					<fieldset class="min-w-0">
						<legend class="font-semibold">{t.preview} · {selected.length}</legend>
						<p class="mt-1 text-sm text-muted">{t.previewHint}</p>
						<div class="mt-3 grid grid-cols-2 gap-2">
							{#each preview as slot (slot.start)}<label
									class="flex min-h-12 cursor-pointer items-center gap-2 rounded-2xl border border-ink/15 bg-white/70 p-3 has-checked:border-accent"
									><input
										type="checkbox"
										checked={!excluded.includes(slot.start)}
										onchange={() => toggle(slot.start)}
										class="size-4 accent-ink"
									/><span class="text-sm font-semibold">{time(slot)}</span></label
								>{/each}
						</div>
					</fieldset>
					<p class="text-sm text-muted">{t.remaining}</p>
				{/if}
				{#if date && !valid}<p class="text-sm text-red-800">{t.invalidRange}</p>{/if}
			</fieldset>
			{#if task.error}<p class={alert} role="alert">{errorMessage(locale, task.error)}</p>{/if}
			<div class="flex flex-wrap gap-2">
				<button class={button.primary} disabled={task.busy || !valid || !hasChildren}
					>{task.busy ? t.publishing : t.publish}</button
				><button
					type="button"
					class={button.quiet}
					disabled={task.busy}
					onclick={() => (showForm = false)}>{t.cancel}</button
				>
			</div>
		</form>
	{/if}
	{#if !app.meetingsLoaded && !app.meetingsError}<p role="status" class="text-muted">{t.loading}</p>
	{:else if app.meetingsLoaded}
		{#if !staff}<p class="text-sm text-muted">{t.onePerChild}</p>{/if}
		{#if !upcoming.length}<p class="text-muted">{staff ? t.emptyStaff : t.emptyFamily}</p>{/if}
		{#each upcomingGroups as slots (slots[0].id)}{@render group(slots, false)}{/each}
		{#if past.length}<details>
				<summary class="cursor-pointer py-3 font-semibold">{t.past} ({past.length})</summary>
				<div class="mt-3 grid gap-4">
					{#each pastGroups as slots (slots[0].id)}{@render group(slots, true)}{/each}
				</div>
			</details>{/if}
	{/if}
</div>

{#snippet group(slots: MeetingSlot[], isPast: boolean)}
	{@const first = slots[0]}
	{@const choices = children(first.offer)}
	<section class={surface}>
		<div class="flex items-start justify-between gap-3">
			<h2 class="min-w-0 text-2xl">{meetingDay(locale, first.start)}</h2>
			{#if !isPast && canManage(first)}
				<button
					type="button"
					class="{button.icon} -mt-2 -mr-2 hover:bg-red-50 hover:text-red-700"
					title={t.removeDay}
					aria-label={t.removeDay}
					onclick={() => (dayRemoval = removableDay(first))}
				>
					<Icon name="trash" />
				</button>
			{/if}
		</div>
		<p class="mt-1 text-muted">{app.myClassrooms.find((c) => c.id === first.classroom)?.name}</p>
		{#if staff && first.teacher}<p class="mt-1 text-sm text-muted">
				{app.catalog.teachers.find((c) => c.id === first.teacher)?.name}
			</p>{/if}
		{#if !staff && !isPast}
			{#if choices.length > 1}<label class="{field.label} mt-4"
					><span class={field.name}>{t.child}</span><select
						class={field.input}
						value={chosenChild(first.offer)}
						onchange={(e) =>
							(selectedChildren = { ...selectedChildren, [first.offer]: e.currentTarget.value })}
						>{#each choices as child (child.child)}<option value={child.child}>{child.name}</option
							>{/each}</select
					></label
				>
			{:else if choices.length === 1}<p class="mt-3 font-semibold">{choices[0].name}</p>
			{:else}<p class="mt-3 text-sm text-muted">{t.noInvite}</p>{/if}
			{#if alreadyBooked(first.offer)}<p class="mt-2 text-sm text-muted">{t.already}</p>{/if}
		{/if}
		<ul class="mt-5 grid gap-2">
			{#each slots as slot (slot.id)}
				<li
					class="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-ink/10 p-3 {slot.mine
						? 'bg-white ring-2 ring-accent/40'
						: slot.booked
							? 'bg-ink/5'
							: 'bg-white/60'}"
				>
					<div>
						<p class="font-semibold">{time(slot)}</p>
						<p class="text-sm text-muted">
							{slot.mine
								? t.mine
								: slot.booked
									? t.booked
									: isPast
										? t.closed
										: t.free}{#if slot.booked && (staff || slot.mine)}{#if childName(slot)}
									· {childName(slot)}{/if}{/if}
						</p>
					</div>
					{#if !isPast}
						{#if slot.booked && (slot.mine || canManage(slot))}<button
								type="button"
								class={button.danger}
								onclick={() => (confirmation = { slot, action: 'cancel' })}
								>{t.cancelBooking}</button
							>
						{:else if !slot.booked && canManage(slot)}<button
								type="button"
								class={button.quiet}
								onclick={() => (confirmation = { slot, action: 'remove' })}>{t.remove}</button
							>
						{:else if !slot.booked && !staff}<button
								type="button"
								class={button.secondary}
								disabled={!chosenChild(slot.offer) || alreadyBooked(slot.offer)}
								onclick={() =>
									(confirmation = { slot, action: 'book', child: chosenChild(slot.offer) })}
								>{t.reserve}</button
							>{/if}
					{/if}
				</li>
			{/each}
		</ul>
	</section>
{/snippet}

{#if confirmation}
	{@const asked = actions[confirmation.action]}
	<ConfirmDialog
		{locale}
		title={asked.title}
		copy={`${meetingDay(locale, confirmation.slot.start)} · ${time(confirmation.slot)}. ${asked.copy}`}
		confirmLabel={asked.label}
		danger={confirmation.action !== 'book'}
		onconfirm={confirm}
		onclose={() => (confirmation = undefined)}
	/>
{/if}

{#if dayRemoval?.length}
	<ConfirmDialog
		{locale}
		title={t.removeDay}
		copy={`${meetingDay(locale, dayRemoval[0].start)} · ${app.myClassrooms.find((c) => c.id === dayRemoval![0].classroom)?.name}. ${t.removeDayCopy(dayRemoval.length, dayRemoval.filter((s) => s.booked).length)}`}
		confirmLabel={t.removeDay}
		danger
		onconfirm={removeDay}
		onclose={() => (dayRemoval = undefined)}
	/>
{/if}
