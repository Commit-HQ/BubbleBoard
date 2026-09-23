<script lang="ts">
	import { goto } from '$app/navigation';
	import AttachFiles from '$lib/app/AttachFiles.svelte';
	import ConfirmDialog from '$lib/app/ConfirmDialog.svelte';
	import InquiryLink from '$lib/app/InquiryLink.svelte';
	import MessageBubble from '$lib/app/MessageBubble.svelte';
	import MessagePolicy from '$lib/app/MessagePolicy.svelte';
	import RefreshButton from '$lib/app/RefreshButton.svelte';
	import Screen from '$lib/app/Screen.svelte';
	import { getApp, Task, type SealedMessage } from '$lib/app/state.svelte';
	import { alert, button, everyHalfMinute, field, queryParam, surface } from '$lib/app/ui';
	import Icon from '$lib/components/Icon.svelte';
	import IconTile from '$lib/components/IconTile.svelte';
	import { createId } from '$lib/crypto';
	import { errorCode } from '$lib/errors';
	import type { NewFile, NoticeFile } from '$lib/files';
	import { errorMessage, messages } from '$lib/i18n';
	import {
		byTeacher,
		chargesAllowance,
		closingSoon,
		messageClock,
		messageDate,
		messageShortDate,
		messageTime,
		mergeRecentMessages,
		remainingMessages,
		sendingLeft,
		type OpenMessage
	} from '$lib/messages';
	import { appPath } from '$lib/paths';
	import { onMount, untrack } from 'svelte';
	import type { PageProps } from './$types';

	// Private conversations between one family and its classroom's teachers: the inbox, one conversation as a
	// chat, and the form that starts a new one. A family's message spends one of the month's inquiries unless
	// it answers a teacher, so the app says what a message costs before it goes, and asks once more in the
	// conversation itself.
	let { data }: PageProps = $props();
	const app = getApp();
	const t = $derived(messages[data.locale].app.messaging);
	const id = $derived(queryParam('id'));
	const creating = $derived(queryParam('new') === '1');
	const thread = $derived(app.conversations.find((item) => item.id === id));
	const staff = $derived(app.status === 'staff');
	let search = $state('');
	let visibleCount = $state(30);
	let filter = $state('all');
	let classroom = $state('');
	let family = $state('');
	let subject = $state('');
	let text = $state('');
	let rows = $state.raw<OpenMessage[]>([]);
	let more = $state(false);
	let busy = $state(false);
	let loading = $state(false);
	let failure = $state<string>();
	let closing = $state(false);
	let removing = $state(false);
	let confirming = $state(false);
	/** The message being changed in the composer, and the one whose deletion is being confirmed. */
	let editing = $state.raw<OpenMessage>();
	let deleting = $state.raw<OpenMessage>();
	/** The files a teacher attaches to the message being written, sealed as each was attached. */
	let files = $state.raw<(NoticeFile | NewFile)[]>([]);
	let attaching = $state(false);
	const filesTask = new Task();
	let end = $state<HTMLOListElement>();
	/** The clock the sending window is measured against, moved on with every look for new messages. */
	let now = $state(Date.now());
	let scrolledTo = 0;
	let generation = 0;
	let viewVersion = 0;
	let pending: { fingerprint: string; sealed: SealedMessage; files: NewFile[] } | undefined;

	const policy = $derived(
		app.messagePolicies.find((item) => item.classroom === (thread?.classroom ?? classroom))
	);
	const families = $derived(
		app.catalog.families.filter((item) => item.classrooms.includes(classroom))
	);
	/** Whether the next message spends an inquiry: a new one always does, an answer to a teacher never. */
	const charged = $derived(
		!staff && (creating || chargesAllowance(rows.at(-1)?.author ?? thread?.author))
	);
	const remaining = $derived(policy ? remainingMessages(policy) : 0);
	/** Minutes left in today's window, and whether it's short enough to say so in red. */
	const left = $derived(policy && sendingLeft(policy, now));
	const allowed = $derived(left !== undefined);
	const closingIn = $derived(left !== undefined && left <= closingSoon ? left : undefined);
	const canSend = $derived(staff || (allowed && (!charged || remaining > 0)));
	/**
	 * Who this device writes as, which is what makes a message its own to change: a teacher's own messages,
	 * not a colleague's, and, on a family device, the family's, which all of its devices share.
	 */
	const mineAuthor = $derived(
		staff ? (app.me ? `teacher:${app.me.id}` : '') : `family:${app.messageFamily ?? ''}`
	);
	const ownMessage = (row: OpenMessage) => !!mineAuthor && row.author === mineAuthor;
	/**
	 * Whether the other side has written since a message: an answer is to the words that were there, so the
	 * message stays as it was answered. Newer messages are always on the page, so the loaded rows suffice.
	 */
	const answered = (row: OpenMessage) =>
		rows.some(
			(later) => later.sequence > row.sequence && byTeacher(later.author) !== byTeacher(row.author)
		);
	/**
	 * Whether the viewer may still change one of their own messages: while the inquiry is open and nobody has
	 * answered it, and, for a family, until a teacher has opened the conversation as far as it. The server
	 * decides each of these for itself; this only keeps Edit off messages where it wouldn't go through.
	 */
	const canChange = (row: OpenMessage) =>
		!!thread &&
		!thread.closed &&
		!row.deletedAt &&
		ownMessage(row) &&
		!answered(row) &&
		(staff || row.sequence > thread.seenSequence);
	/** Only teachers delete a message, and only their own: a family's inquiry stays where it was sent. */
	const canRemove = (row: OpenMessage) => staff && canChange(row);
	const filtered = $derived(
		app.conversations.filter(
			(item) =>
				(!classroom || item.classroom === classroom) &&
				(filter === 'all' || !!item.closed === (filter === 'closed')) &&
				item.subject.toLocaleLowerCase(data.locale).includes(search.toLocaleLowerCase(data.locale))
		)
	);
	/** The inbox shows its filters only where there's something to filter. */
	const pickClassroom = $derived(app.myClassrooms.length > 1);
	const pickState = $derived(app.conversations.some((item) => item.closed));

	const classroomName = (id: string) => app.myClassrooms.find((item) => item.id === id)?.name ?? '';
	const familyName = (id: string) =>
		app.catalog.families.find((item) => item.id === id)?.name ?? t.parent;
	/** Who the conversation is with, as its tile shows them: the family for teachers, the classroom for families. */
	const withName = (item: { classroom: string; family: string }) =>
		staff ? familyName(item.family) : classroomName(item.classroom);
	/** The children the family has in this classroom, so a teacher sees whose parent is writing. */
	function childrenOf(item: { classroom: string; family: string }) {
		const names = app.catalog.children
			.filter((child) => child.classroom === item.classroom && child.families.includes(item.family))
			.map((child) => child.name);
		return names.length ? t.children(names) : undefined;
	}
	/** The line under a conversation's subject: who a teacher is talking to, and where. */
	const about = (item: { classroom: string; family: string }, withClassroom: boolean) =>
		[
			staff ? familyName(item.family) : undefined,
			staff ? childrenOf(item) : undefined,
			withClassroom ? classroomName(item.classroom) : undefined
		]
			.filter(Boolean)
			.join(' · ');
	const initialOf = (name: string) => [...name][0]?.toLocaleUpperCase(data.locale) ?? '';
	/**
	 * The name above a message: which teacher wrote it, and, on a teacher's device, the family on the other
	 * side. A family sees no name over its own messages, which are all its own.
	 */
	const bubbleName = (author: string, name: string, family: string) =>
		byTeacher(author) ? name || t.teacher : staff ? familyName(family) : undefined;
	/** When the last message came: the time today, the day and month before that. */
	const listTime = (time: number) =>
		messageClock(time).date === messageClock().date
			? messageTime(data.locale, time)
			: messageShortDate(data.locale, time);
	/** The chip above the first message of each day. */
	function dayLabel(time: number) {
		const day = messageClock(time).date;
		if (day === messageClock().date) return t.today;
		if (day === messageClock(Date.now() - 86400000).date) return t.yesterday;
		return messageDate(data.locale, time);
	}

	$effect(() => {
		if (!classroom && app.myClassrooms.length === 1) classroom = app.myClassrooms[0].id;
	});
	$effect(() => {
		if (classroom) family = '';
	});
	$effect(() => {
		id;
		creating;
		untrack(() => {
			viewVersion++;
			busy = false;
			text = '';
			subject = '';
			// The family and the files picked for one message never go with the next one to someone else.
			family = '';
			files = [];
			attaching = false;
			pending = undefined;
			editing = undefined;
			deleting = undefined;
			failure = undefined;
			rows = [];
			more = false;
			loading = false;
			scrolledTo = 0;
			generation++;
		});
	});
	$effect(() => {
		const selected = id;
		const version = app.messagesVersion;
		if (app.connected && selected && version) untrack(() => void load(selected));
	});
	// A conversation opens at its newest message, and follows it as answers come in.
	$effect(() => {
		const last = rows.at(-1)?.sequence ?? 0;
		if (!last || last === scrolledTo) return;
		scrolledTo = last;
		end?.scrollIntoView({ block: 'end' });
	});
	everyHalfMinute((looking) => {
		now = Date.now();
		if (looking && app.connected && !busy) void app.loadMessages();
	});
	// A conversation left behind stops taking what its last load brings back.
	onMount(() => () => {
		generation++;
		viewVersion++;
	});

	async function load(selected: string, older = false) {
		const item = app.conversations.find((item) => item.id === selected);
		if (!item) {
			generation++;
			loading = false;
			rows = [];
			return;
		}
		const ticket = ++generation;
		loading = true;
		try {
			const opened = await app.readConversation(
				item,
				older && rows.length ? rows[0].sequence : undefined
			);
			if (ticket !== generation || id !== selected) return;
			if (older) rows = [...opened, ...rows];
			else rows = mergeRecentMessages(rows, opened);
			if (older || rows.length <= 50) more = opened.length === 50;
			// Only a message the family hasn't seen yet is worth a write; the look for new ones comes round
			// every half minute, and nearly always finds the conversation where it left it.
			const last = opened.at(-1)?.sequence;
			if (last && last > item.readSequence && !older && document.visibilityState === 'visible')
				await app.markConversationRead(selected, last);
		} catch (cause) {
			if (ticket === generation) failure = errorCode(cause);
		} finally {
			if (ticket === generation) loading = false;
		}
	}

	/** Families are asked once more when a message spends an inquiry, so none goes by mistake. */
	function submit(event: SubmitEvent) {
		event.preventDefault();
		if (busy || filesTask.busy || !text.trim()) return;
		// An edit costs nothing and asks nothing: the sending hours and the allowance are about new messages.
		if (editing) void saveEdit();
		else if (!canSend || (creating && !subject.trim())) return;
		else if (charged && !creating) confirming = true;
		else void send();
	}

	/** Puts a message's own words back into the composer, where sending saves the edit instead of a message. */
	function startEditing(row: OpenMessage) {
		editing = row;
		text = row.text;
		attaching = false;
		files = [];
		failure = undefined;
	}

	function stopEditing() {
		editing = undefined;
		text = '';
	}

	async function saveEdit() {
		const message = editing!;
		const version = viewVersion;
		busy = true;
		failure = undefined;
		try {
			await app.editMessage(thread!, message, text.trim());
			if (version !== viewVersion) return;
			stopEditing();
		} catch (cause) {
			if (version === viewVersion) failure = errorCode(cause);
		} finally {
			if (version === viewVersion) busy = false;
		}
	}

	async function removeMessage() {
		await app.deleteMessage(thread!, deleting!);
		deleting = undefined;
	}

	async function send() {
		const selected = id;
		const isNew = creating;
		const version = viewVersion;
		const sameView = () => version === viewVersion && id === selected && creating === isNew;
		const targetClassroom = thread?.classroom ?? classroom;
		const targetFamily = thread?.family ?? app.messageFamily ?? family;
		if (!targetClassroom || !targetFamily) return;
		busy = true;
		failure = undefined;
		try {
			const attached = files.filter((file): file is NewFile => 'sealed' in file);
			const fingerprint = JSON.stringify([
				selected,
				targetClassroom,
				targetFamily,
				subject,
				text,
				attached.map((file) => file.id)
			]);
			let attempt = pending;
			if (attempt?.fingerprint !== fingerprint) {
				const conversation = isNew ? createId() : selected!;
				attempt = {
					fingerprint,
					files: attached,
					sealed: await app.sealFor(
						targetClassroom,
						targetFamily,
						conversation,
						{
							text: text.trim(),
							name: staff ? (app.myName ?? t.teacher) : '',
							...(attached.length ? { files: attached } : {})
						},
						isNew ? subject.trim() : undefined
					)
				};
			}
			if (sameView()) pending = attempt;
			const savedId = attempt.sealed.conversation;
			await app.sendMessage(attempt.sealed, attempt.files);
			if (!sameView()) return;
			text = '';
			files = [];
			attaching = false;
			pending = undefined;
			if (isNew) await goto(appPath(data.locale, 'messages', { id: savedId }));
		} catch (cause) {
			if (sameView()) failure = errorCode(cause);
		} finally {
			if (sameView()) busy = false;
		}
	}

	async function close() {
		await app.closeConversation(id!);
		closing = false;
	}

	/** The inquiry is gone, so the page it was on goes back to the inbox rather than say it isn't there. */
	async function remove() {
		await app.deleteConversation(id!);
		removing = false;
		await goto(appPath(data.locale, 'messages'));
	}
</script>

<Screen
	locale={data.locale}
	title={thread?.subject ?? (creating ? t.new : t.title)}
	need="connected"
	back={id || creating ? appPath(data.locale, 'messages') : undefined}
>
	{#if app.messagesError}
		<p role="alert" class={alert}>{errorMessage(data.locale, app.messagesError)}</p>
	{/if}
	{#if failure}<p role="alert" class={alert}>{errorMessage(data.locale, failure)}</p>{/if}

	{#if id}
		{#if thread}
			<!-- One block, not the page's grid: the box to write in sticks above the messages while they
			scroll, and a sticky box can only move inside the element that holds it. -->
			<div>
				<div class="-mt-2 flex flex-wrap items-center justify-between gap-2">
					<p class="text-muted">{about(thread, true)}</p>
					{#if thread.closed}
						<div class="flex items-center gap-1">
							<span class="rounded-full bg-ink/10 px-3 py-1 text-xs font-semibold text-muted">
								{t.closedStatus}
							</span>
							<!-- A closed inquiry is the only one a teacher can take away, so this is where it goes. -->
							{#if staff}
								<button class={button.danger} onclick={() => (removing = true)}>{t.remove}</button>
							{/if}
						</div>
					{:else if staff}
						<button class={button.secondary} onclick={() => (closing = true)}>{t.close}</button>
					{/if}
				</div>

				{#if more}
					<div class="mt-4 text-center">
						<button class={button.quiet} disabled={loading} onclick={() => load(id!, true)}>
							{t.older}
						</button>
					</div>
				{/if}
				{#if loading && !rows.length}
					<p class="mt-4 text-center text-muted" role="status">{t.loading}</p>
				{/if}
				<ol class="mt-5 grid gap-2" aria-label={thread.subject} bind:this={end}>
					{#each rows as row, index (row.id)}
						{@const previous = rows[index - 1]}
						{#if !previous || messageClock(previous.postedAt).date !== messageClock(row.postedAt).date}
							<li class="mt-2 flex justify-center">
								<span class="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-muted">
									{dayLabel(row.postedAt)}
								</span>
							</li>
						{/if}
						<MessageBubble
							locale={data.locale}
							message={row}
							mine={byTeacher(row.author) === staff}
							name={bubbleName(row.author, row.name, thread.family)}
							openPicture={(file) => app.messagePicture(thread.id, row, file)}
							saveDocument={(file) => app.saveMessageFile(thread.id, row, file)}
							onedit={canChange(row) ? () => startEditing(row) : undefined}
							onremove={canRemove(row) ? () => (deleting = row) : undefined}
						/>
					{/each}
				</ol>

				{#if thread.closed}
					<p class="mt-5 text-muted">{t.closedCopy}</p>
				{:else}
					<form class="sticky bottom-4 mt-5 grid gap-2" onsubmit={submit}>
						{#if editing}
							<div
								class="flex flex-wrap items-center justify-between gap-2 rounded-3xl frosted px-4 py-2"
							>
								<p class="text-sm text-muted">
									{t.editing}{#if !staff}&nbsp;· {t.editHint}{/if}
								</p>
								<button class={button.quiet} type="button" onclick={stopEditing}>
									{t.cancelEditing}
								</button>
							</div>
						{:else if !staff && policy}
							<MessagePolicy
								locale={data.locale}
								{policy}
								{charged}
								{allowed}
								closing={closingIn}
							/>
						{/if}
						{#if staff && !editing && (attaching || files.length)}
							<div class="rounded-3xl frosted p-4">
								<AttachFiles locale={data.locale} task={filesTask} bind:files disabled={busy} />
							</div>
						{/if}
						<div class="flex items-end gap-2 rounded-3xl frosted p-2">
							{#if staff && !editing && !attaching && !files.length}
								<button
									class={button.icon}
									type="button"
									aria-label={messages[data.locale].app.files.attach}
									disabled={busy}
									onclick={() => (attaching = true)}
								>
									<Icon name="plus" />
								</button>
							{/if}
							<label class="min-w-0 grow">
								<span class="sr-only">{t.body}</span>
								<textarea
									class="field-sizing-content max-h-40 w-full resize-none bg-transparent px-3 py-2.5 text-base focus-visible:outline-none"
									rows="1"
									required
									maxlength="4000"
									placeholder={t.write}
									bind:value={text}
									disabled={busy || (!editing && !canSend)}></textarea>
							</label>
							<button
								class={button.iconPrimary}
								aria-label={editing ? t.saveEditing : t.send}
								disabled={busy || filesTask.busy || (!editing && !canSend) || !text.trim()}
							>
								<Icon name="arrowUp" />
							</button>
						</div>
					</form>
				{/if}
			</div>
		{:else if !app.messagesError}
			<p class="text-muted">{messages[data.locale].app.notFound.copy}</p>
		{/if}
	{:else if creating}
		<form class="{surface} grid gap-5" onsubmit={submit}>
			<fieldset class="grid gap-5" disabled={busy}>
				{#if pickClassroom}
					<label class={field.label}>
						<span class={field.name}>{t.classroom}</span>
						<select class={field.input} required bind:value={classroom}>
							<option value="">{t.choose}</option>
							{#each app.myClassrooms as item (item.id)}<option value={item.id}>{item.name}</option
								>{/each}
						</select>
					</label>
				{/if}
				{#if staff}
					<label class={field.label}>
						<span class={field.name}>{t.family}</span>
						<select class={field.input} required bind:value={family}>
							<option value="">{t.choose}</option>
							{#each families as item (item.id)}<option value={item.id}>{item.name}</option>{/each}
						</select>
					</label>
				{/if}
				{#if !staff && policy}
					<MessagePolicy locale={data.locale} {policy} charged {allowed} closing={closingIn} full />
				{/if}
				<!-- Nothing to write in while nothing can be sent, but the classroom above stays open: it's what
				decides which hours and which allowance apply. -->
				<fieldset class="grid gap-5" disabled={!!classroom && !canSend}>
					<label class={field.label}>
						<span class={field.name}>{t.subject}</span>
						<input class={field.input} required maxlength="120" bind:value={subject} />
					</label>
					<label class={field.label}>
						<span class={field.name}>{t.body}</span>
						<textarea class={field.input} rows="6" required maxlength="4000" bind:value={text}
						></textarea>
					</label>
					{#if staff}
						<AttachFiles locale={data.locale} task={filesTask} bind:files disabled={busy} />
					{/if}
				</fieldset>
				<button
					class="{button.primary} justify-self-start"
					disabled={!canSend ||
						filesTask.busy ||
						!classroom ||
						(staff && !family) ||
						!subject.trim() ||
						!text.trim()}>{t.sendInquiry}</button
				>
			</fieldset>
		</form>
	{:else}
		<div class="flex flex-wrap items-center gap-2">
			<a class={button.primary} href={appPath(data.locale, 'messages', { new: '1' })}>
				<Icon name="plus" class="size-4" />{t.new}
			</a>
			<RefreshButton label={t.refresh} onrefresh={() => app.loadMessages()} />
		</div>

		{#if app.conversations.length}
			{#if app.conversations.length > 5 || pickState || pickClassroom}
				<div class="grid gap-3">
					{#if app.conversations.length > 5}
						<label class={field.label}>
							<span class="sr-only">{t.search}</span>
							<input class={field.input} type="search" placeholder={t.search} bind:value={search} />
						</label>
					{/if}
					{#if pickState || pickClassroom}
						<div class="flex flex-wrap items-center gap-2">
							{#if pickState}
								{#each [['all', t.all], ['open', t.open], ['closed', t.closed]] as [value, label] (value)}
									<button
										class={button.chip}
										type="button"
										aria-pressed={filter === value}
										onclick={() => (filter = value)}>{label}</button
									>
								{/each}
							{/if}
							{#if pickClassroom}
								<label class={pickState ? 'ml-auto' : ''}>
									<span class="sr-only">{t.classroom}</span>
									<select class={button.chipSelect} bind:value={classroom}>
										<option value="">{t.classroom}: {t.all}</option>
										{#each app.myClassrooms as item (item.id)}<option value={item.id}
												>{item.name}</option
											>{/each}
									</select>
								</label>
							{/if}
						</div>
					{/if}
				</div>
			{/if}
			<ul class="grid gap-2">
				{#each filtered.slice(0, visibleCount) as item (item.id)}
					<InquiryLink
						href={appPath(data.locale, 'messages', { id: item.id })}
						initial={initialOf(withName(item))}
						subject={item.subject}
						preview={item.deletedAt ? t.deletedMessage : item.preview}
						detail={[about(item, pickClassroom), item.closed ? t.closedStatus : undefined]
							.filter(Boolean)
							.join(' · ')}
						time={listTime(item.postedAt)}
						unread={item.lastSequence > item.readSequence}
						unreadLabel={t.unread}
					/>
				{:else}
					<li class="text-muted">{t.empty}</li>
				{/each}
			</ul>
			{#if filtered.length > visibleCount}
				<button class="{button.secondary} justify-self-center" onclick={() => (visibleCount += 30)}>
					{t.more}
				</button>
			{/if}
			<p class="text-sm text-muted">{t.retention}</p>
		{:else if app.messagesVersion}
			<!-- Once the inbox has answered at least once: before that it's still loading, and a load that
			failed says so in the alert above instead of telling a family it has no messages. -->
			<div class="{surface} grid justify-items-start gap-3">
				<IconTile icon="message" />
				<h2 class="text-2xl">{t.emptyTitle}</h2>
				<p class="text-muted">{staff ? t.emptyCopyStaff : t.emptyCopy}</p>
			</div>
		{/if}
	{/if}

	{#if closing}
		<ConfirmDialog
			locale={data.locale}
			title={t.closeTitle}
			copy={t.closeCopy}
			confirmLabel={t.close}
			onconfirm={close}
			onclose={() => (closing = false)}
		/>
	{:else if removing}
		<ConfirmDialog
			locale={data.locale}
			title={t.removeTitle}
			copy={t.removeCopy}
			confirmLabel={t.remove}
			danger
			onconfirm={remove}
			onclose={() => (removing = false)}
		/>
	{:else if deleting}
		<ConfirmDialog
			locale={data.locale}
			title={t.removeMessageTitle}
			copy={t.removeMessageCopy}
			confirmLabel={t.removeMessage}
			danger
			onconfirm={removeMessage}
			onclose={() => (deleting = undefined)}
		/>
	{:else if confirming}
		<ConfirmDialog
			locale={data.locale}
			title={t.confirmTitle}
			copy={t.confirmCopy(Math.max(0, remaining - 1))}
			confirmLabel={t.send}
			onconfirm={async () => {
				await send();
				confirming = false;
			}}
			onclose={() => (confirming = false)}
		/>
	{/if}
</Screen>
