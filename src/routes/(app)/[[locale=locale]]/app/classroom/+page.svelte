<script lang="ts">
	import { goto } from '$app/navigation';
	import CardSheet, { type PrintableCard } from '$lib/app/CardSheet.svelte';
	import Checklist from '$lib/app/Checklist.svelte';
	import ConfirmDialog from '$lib/app/ConfirmDialog.svelte';
	import MessageSettings from '$lib/app/MessageSettings.svelte';
	import ListLink from '$lib/app/ListLink.svelte';
	import Screen from '$lib/app/Screen.svelte';
	import { getApp } from '$lib/app/state.svelte';
	import { button, queryParam, surface } from '$lib/app/ui';
	import Icon from '$lib/components/Icon.svelte';
	import { listNames, messages } from '$lib/i18n';
	import { namesOf } from '$lib/kindergarten';
	import type { MessagePolicy } from '$lib/messages';
	import { appPath } from '$lib/paths';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const app = getApp();
	const t = $derived(messages[data.locale].app);
	const id = $derived(queryParam('id'));
	const classroom = $derived(app.catalog.classrooms.find((candidate) => candidate.id === id));
	const children = $derived(app.catalog.children.filter((child) => child.classroom === id));
	const families = $derived(
		app.catalog.families.filter((family) => id !== null && family.classrooms.includes(id))
	);
	const teachers = $derived(
		app.catalog.teachers.filter((teacher) => classroom && teacher.classrooms.includes(classroom.id))
	);
	const messaging = $derived(app.messagePolicies.find((policy) => policy.classroom === id));
	/** Whether this device runs the classroom: a head, or the group lead it belongs to. */
	const manages = $derived(classroom !== undefined && app.manages(classroom.id));
	let open = $state<'delete' | 'replace' | 'confirmReplace' | 'messages'>();
	/** The families whose cards are chosen to be replaced. */
	let chosen = $state<string[]>([]);
	let printed = $state.raw<PrintableCard[]>();

	async function remove(classroom: string) {
		await app.deleteClassroom(classroom);
		await goto(appPath(data.locale, 'manage'));
	}

	/** The family's children in this classroom, which tell cards with similar names apart. */
	function childrenOf(family: string) {
		return children.filter((child) => child.families.includes(family)).map((child) => child.name);
	}

	/** The week families may write in, in one line: the days that are open, and when, folded where they agree. */
	function sendingHours({ schedule }: MessagePolicy) {
		const open = schedule.flatMap((day, index) => (day ? [{ ...day, index }] : []));
		if (!open.length) return t.messaging.noDays;
		const days = open.map(({ index }) => t.messaging.daysShort[index]);
		const alike = open.every(({ start, end }) => start === open[0].start && end === open[0].end);
		return alike
			? `${listNames(data.locale, days)} ${open[0].start}–${open[0].end}`
			: open
					.map(({ index, start, end }) => `${t.messaging.daysShort[index]} ${start}–${end}`)
					.join(' · ');
	}

	function closeReplacing() {
		open = undefined;
		chosen = [];
	}

	// Replaced together, so cards that were never printed, or lost, go out on one sheet.
	async function replaceCards() {
		const replacing = families.filter((family) => chosen.includes(family.id));
		const secrets = await app.replaceFamilyCards(replacing);
		printed = replacing.map((family, index) => ({
			secret: secrets[index],
			name: family.name,
			kind: 'family',
			detail: listNames(data.locale, namesOf(app.catalog.classrooms, family.classrooms))
		}));
		closeReplacing();
	}
</script>

{#if printed}
	<CardSheet locale={data.locale} cards={printed} ondone={() => (printed = undefined)} />
{:else}
	<Screen
		locale={data.locale}
		title={classroom?.name ?? t.notFound.title}
		back={appPath(data.locale, 'manage')}
		subtitle={classroom && t.counts.children(children.length)}
		rename={classroom && app.head
			? {
					label: t.manage.classroomName,
					save: (name) => app.renameClassroom(classroom.id, name)
				}
			: undefined}
	>
		{#if classroom}
			{#if manages}
				<p class="-mt-4 text-muted">
					{teachers.length
						? t.classroom.teachers(teachers.map((teacher) => teacher.name))
						: t.classroom.noTeachers}
				</p>
			{/if}
			{#if manages || families.length}
				<div class="flex flex-wrap gap-2">
					{#if manages}
						<a
							class={button.primary}
							href={appPath(data.locale, 'child/new', { classroom: classroom.id })}
						>
							<Icon name="plus" class="size-4" />{t.classroom.addChild}
						</a>
					{/if}
					{#if manages && families.length}
						<button
							class={button.secondary}
							type="button"
							aria-expanded={open === 'replace' || open === 'confirmReplace'}
							onclick={() => (open = 'replace')}
						>
							<Icon name="refresh" class="size-4" />{t.classroom.replaceCards}
						</button>
					{/if}
					{#if app.head && !children.length}
						<button class={button.danger} type="button" onclick={() => (open = 'delete')}>
							<Icon name="trash" class="size-4" />{t.classroom.delete}
						</button>
					{/if}
				</div>
			{/if}
			{#if open === 'replace' || open === 'confirmReplace'}
				<form
					class="{surface} grid gap-5"
					onsubmit={(event) => {
						event.preventDefault();
						open = 'confirmReplace';
					}}
				>
					<div>
						<h2 class="text-2xl">{t.classroom.replaceTitle}</h2>
						<p class="mt-1 text-muted">{t.classroom.replaceCopy}</p>
					</div>
					<Checklist
						locale={data.locale}
						label={t.child.cards}
						options={families.map((family) => ({
							value: family.id,
							label: family.name,
							detail: listNames(data.locale, childrenOf(family.id))
						}))}
						bind:chosen
					/>
					<div class="flex flex-wrap gap-2">
						<button class={button.primary} type="submit" disabled={!chosen.length}>
							{t.classroom.replaceSubmit(chosen.length)}
						</button>
						<button class={button.quiet} type="button" onclick={closeReplacing}>
							{t.actions.cancel}
						</button>
					</div>
				</form>
			{/if}

			<section class="grid gap-3" aria-labelledby="children-title">
				<h2 id="children-title" class="text-2xl">{t.classroom.children}</h2>
				{#if children.length}
					<ul class="grid gap-2">
						{#each children as child (child.id)}
							<ListLink
								href={appPath(data.locale, 'child', { id: child.id })}
								title={child.name}
								detail={listNames(data.locale, namesOf(app.catalog.families, child.families)) ||
									t.classroom.noCards}
							/>
						{/each}
					</ul>
				{:else}
					<p class="text-muted">{t.classroom.empty}</p>
				{/if}
			</section>

			{#if manages && messaging}
				<!-- Under the children, where staff come to settle the classroom rather than to look
				someone up: the week at a glance, and the form itself only once it's asked for. -->
				<section class="grid gap-3" aria-labelledby="messaging-title">
					<h2 id="messaging-title" class="text-2xl">{t.messaging.settings}</h2>
					{#if open === 'messages'}
						<MessageSettings
							locale={data.locale}
							settings={messaging}
							onclose={() => (open = undefined)}
						/>
					{:else}
						<div
							class="flex flex-wrap items-center justify-between gap-3 rounded-3xl glass px-5 py-4"
						>
							<p class="min-w-0">
								<span class="block font-bold">
									{messaging.enabled ? t.messaging.settingsOn : t.messaging.settingsOff}
								</span>
								<span class="block text-sm text-muted">
									{messaging.enabled
										? `${t.messaging.quotaEach(messaging.monthlyLimit)} · ${sendingHours(messaging)}`
										: t.messaging.disabled}
								</span>
							</p>
							<button
								class={button.secondary}
								type="button"
								aria-expanded="false"
								onclick={() => (open = 'messages')}
							>
								<Icon name="pencil" class="size-4" />{t.messaging.edit}
							</button>
						</div>
					{/if}
				</section>
			{/if}

			{#if open === 'delete'}
				<ConfirmDialog
					locale={data.locale}
					title={t.classroom.deleteTitle(classroom.name)}
					copy={t.classroom.deleteCopy}
					confirmLabel={t.classroom.delete}
					danger
					onconfirm={() => remove(classroom.id)}
					onclose={() => (open = undefined)}
				/>
			{:else if open === 'confirmReplace'}
				<ConfirmDialog
					locale={data.locale}
					title={t.classroom.replaceConfirm(chosen.length)}
					copy={t.classroom.replaceConfirmCopy}
					confirmLabel={t.classroom.replaceSubmit(chosen.length)}
					onconfirm={replaceCards}
					onclose={() => {
						if (open === 'confirmReplace') open = 'replace';
					}}
				/>
			{/if}
		{:else}
			<p class="text-muted">{t.notFound.copy}</p>
		{/if}
	</Screen>
{/if}
