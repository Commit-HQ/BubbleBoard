<script lang="ts">
	import { onMount } from 'svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { errorMessage, messages, type Locale } from '$lib/i18n';
	import { meetingDay, meetingTime, type MeetingSlot } from '$lib/meetings';
	import { messageClock } from '$lib/messages';
	import { getApp } from './state.svelte';
	import { alert, button, everyHalfMinute, field, surface } from './ui';
	import ConfirmDialog from './ConfirmDialog.svelte';
	import MeetingTimesForm from './MeetingTimesForm.svelte';
	import { spotlit } from './spotlight.svelte';
	let { locale }: { locale: Locale } = $props();
	const app = getApp();
	const t = $derived(messages[locale].app.meetings);
	const staff = $derived(app.status === 'staff');
	let now = $state(Date.now()),
		showForm = $state(false),
		/** The offer whose day is being changed. */
		editing = $state<string>(),
		notice = $state('');
	let selectedChildren = $state<Record<string, string>>({});
	let dayRemoval = $state<MeetingSlot[]>();
	let confirmation = $state<{
		slot: MeetingSlot;
		action: 'book' | 'cancel' | 'remove';
		child?: string;
	}>();
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
	const canManage = (s: MeetingSlot) =>
		staff && (app.manages(s.classroom) || s.teacher === app.me?.id);
	/** On a staff device, the children an offer invites who have no time in it yet, whom staff book for. */
	const bookable = (offer: string) => {
		const booked = new Set(app.meetings.filter((s) => s.offer === offer).map((s) => s.child));
		return app.meetingInvited
			.filter((invited) => invited.offer === offer && !booked.has(invited.child))
			.map(({ child }) => ({
				id: child,
				name: app.catalog.children.find((c) => c.id === child)?.name ?? ''
			}))
			.toSorted((a, b) => a.name.localeCompare(b.name, locale));
	};
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
	everyHalfMinute((looking) => {
		now = Date.now();
		if (looking) void app.loadMeetings();
	});
	const done = (message: string) => {
		showForm = false;
		editing = undefined;
		notice = message;
	};
	/** What each of the three changes is called, asked, and said once it's done. */
	const actions = $derived({
		// Staff book a time for a family, choosing the child in the question.
		book: staff
			? { title: t.bookFor, label: t.reserve, copy: t.bookForCopy, done: t.bookedFor }
			: { title: t.reservation, label: t.reserve, copy: t.confirmCopy, done: t.reserved },
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
					editing = undefined;
				}}
				aria-expanded={showForm}>{showForm ? t.cancelForm : t.offer}</button
			>{/if}
	</div>
	{#if notice}<p role="status" class="rounded-2xl bg-white/70 p-4 font-semibold">{notice}</p>{/if}
	{#if app.meetingsError}<p class={alert} role="alert">
			{errorMessage(locale, app.meetingsError)}
		</p>{/if}
	{#if showForm && staff}
		<MeetingTimesForm {locale} {now} ondone={done} onclose={() => (showForm = false)} />
	{/if}
	{#if !app.meetingsLoaded && !app.meetingsError}<p role="status" class="text-muted">{t.loading}</p>
	{:else if app.meetingsLoaded}
		{#if !staff}<p class="text-sm text-muted">{t.onePerChild}</p>{/if}
		{#if !upcoming.length}<p class="text-muted">{staff ? t.emptyStaff : t.emptyFamily}</p>{/if}
		<!-- An offer is one day; keyed by it, an open form stays as its first time passes. -->
		{#each upcomingGroups as slots (slots[0].offer)}
			{#if editing === slots[0].offer}
				<MeetingTimesForm
					{locale}
					{now}
					day={app.meetings.filter((s) => s.offer === editing)}
					ondone={done}
					onclose={() => (editing = undefined)}
				/>
			{:else}{@render group(slots, false)}{/if}
		{/each}
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
				<div class="-mt-2 -mr-2 flex">
					<button
						type="button"
						class={button.icon}
						title={t.edit}
						aria-label={t.edit}
						onclick={() => {
							editing = first.offer;
							showForm = false;
						}}
					>
						<Icon name="pencil" />
					</button>
					<button
						type="button"
						class="{button.icon} hover:bg-red-50 hover:text-red-700"
						title={t.removeDay}
						aria-label={t.removeDay}
						onclick={() => (dayRemoval = removableDay(first))}
					>
						<Icon name="trash" />
					</button>
				</div>
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
					{@attach spotlit(slot.id)}
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
								? slot.staffBooked
									? t.mineByStaff
									: t.mine
								: slot.booked
									? t.booked
									: isPast
										? t.closed
										: t.free}{#if slot.booked && (staff || slot.mine)}{#if childName(slot)}
									· {childName(slot)}{/if}{/if}{#if staff && slot.staffBooked}
								· {t.byStaff}{/if}
						</p>
					</div>
					{#if !isPast}
						{#if slot.booked && (slot.mine || canManage(slot))}<button
								type="button"
								class={button.danger}
								onclick={() => (confirmation = { slot, action: 'cancel' })}
								>{t.cancelBooking}</button
							>
						{:else if !slot.booked && canManage(slot)}
							{@const children = bookable(slot.offer)}
							<div class="flex flex-wrap gap-2">
								{#if children.length}<button
										type="button"
										class={button.secondary}
										onclick={() => (confirmation = { slot, action: 'book', child: children[0].id })}
										>{t.bookFor}</button
									>{/if}
								<button
									type="button"
									class={button.quiet}
									onclick={() => (confirmation = { slot, action: 'remove' })}>{t.remove}</button
								>
							</div>
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
	>
		{#if staff && confirmation.action === 'book'}
			{@const current = confirmation}
			<label class={field.label}>
				<span class={field.name}>{t.child}</span>
				<select
					class={field.input}
					value={current.child}
					onchange={(e) => (confirmation = { ...current, child: e.currentTarget.value })}
				>
					{#each bookable(current.slot.offer) as child (child.id)}
						<option value={child.id}>{child.name}</option>
					{/each}
				</select>
			</label>
		{/if}
	</ConfirmDialog>
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
