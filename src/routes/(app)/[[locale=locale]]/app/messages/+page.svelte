<script lang="ts">
	import { goto } from '$app/navigation';
	import { request } from '$lib/api';
	import ConfirmDialog from '$lib/app/ConfirmDialog.svelte';
	import MessagePolicy from '$lib/app/MessagePolicy.svelte';
	import Screen from '$lib/app/Screen.svelte';
	import { getApp } from '$lib/app/state.svelte';
	import { button, field, queryParam, surface } from '$lib/app/ui';
	import { createId } from '$lib/crypto';
	import { errorCode } from '$lib/errors';
	import { errorMessage, messages } from '$lib/i18n';
	import {
		openMessage,
		sealMessage,
		sealSubject,
		type MessageRecord,
		type OpenMessage
	} from '$lib/messages';
	import { appPath } from '$lib/paths';
	import { onMount, untrack } from 'svelte';
	import type { PageProps } from './$types';
	let { data }: PageProps = $props();
	const app = getApp();
	const t = $derived(messages[data.locale].app.messaging);
	const id = $derived(queryParam('id'));
	const creating = $derived(queryParam('new') === '1');
	const thread = $derived(app.conversations.find((item) => item.id === id));
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
	let generation = 0;
	let pending: { fingerprint: string; payload: Record<string, string> } | undefined;
	const policy = $derived(
		app.messagePolicies.find((item) => item.classroom === (thread?.classroom ?? classroom))
	);
	const families = $derived(
		app.catalog.families.filter((item) => item.classrooms.includes(classroom))
	);
	const canSend = $derived(
		app.status === 'staff' ||
			(!!policy?.allowed && (!creating || policy.used < policy.monthlyLimit))
	);
	const filtered = $derived(
		app.conversations.filter(
			(item) =>
				(!classroom || item.classroom === classroom) &&
				(filter === 'all' || !!item.closed === (filter === 'closed')) &&
				item.subject.toLocaleLowerCase(data.locale).includes(search.toLocaleLowerCase(data.locale))
		)
	);
	const classroomName = (id: string) => app.myClassrooms.find((item) => item.id === id)?.name ?? '';
	const familyName = (id: string) =>
		app.catalog.families.find((item) => item.id === id)?.name ?? t.parent;
	const stamp = (time: number) =>
		new Intl.DateTimeFormat(data.locale, {
			dateStyle: 'short',
			timeStyle: 'short',
			timeZone: 'Europe/Zagreb'
		}).format(time);
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
			text = '';
			subject = '';
			pending = undefined;
			failure = undefined;
			rows = [];
			more = false;
			loading = false;
			generation++;
		});
	});
	$effect(() => {
		const selected = id;
		const version = app.messagesVersion;
		if (app.connected && selected && version) untrack(() => void load(selected));
	});
	onMount(() => {
		const interval = setInterval(() => {
			if (document.visibilityState === 'visible' && app.connected && !busy) void app.loadMessages();
		}, 30000);
		return () => {
			clearInterval(interval);
			generation++;
		};
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
			const before = older && rows.length ? `?before=${rows[0].sequence}` : '';
			const records = await request<MessageRecord[]>('GET', `/api/messages/${selected}${before}`);
			const key = await app.messageKey(item.family);
			const opened = await Promise.all(
				records.map((record) => openMessage(record, key, item.classroom, item.id))
			);
			if (ticket !== generation || id !== selected) return;
			if (older) rows = [...opened, ...rows];
			else {
				const oldest = opened[0]?.sequence ?? Infinity;
				rows = [...rows.filter((row) => row.sequence < oldest), ...opened];
			}
			if (older || rows.length <= 50) more = records.length === 50;
			const last = opened.at(-1)?.sequence;
			if (last && !older && document.visibilityState === 'visible') {
				await request('PUT', `/api/messages/${selected}`, { action: 'read', sequence: last });
				if (ticket === generation)
					app.conversations = app.conversations.map((row) =>
						row.id === selected ? { ...row, readSequence: Math.max(row.readSequence, last) } : row
					);
			}
		} catch (cause) {
			if (ticket === generation) failure = errorCode(cause);
		} finally {
			if (ticket === generation) loading = false;
		}
	}
	async function send(event: SubmitEvent) {
		event.preventDefault();
		if (busy || !text.trim() || !canSend || (creating && !subject.trim())) return;
		const targetClassroom = thread?.classroom ?? classroom;
		const targetFamily = thread?.family ?? app.messageFamily ?? family;
		if (!targetClassroom || !targetFamily) return;
		busy = true;
		failure = undefined;
		try {
			const fingerprint = JSON.stringify([id, targetClassroom, targetFamily, subject, text]);
			if (pending?.fingerprint !== fingerprint) {
				const key = await app.messageKey(targetFamily);
				const message = createId();
				const conversation = creating ? createId() : id!;
				const content = await sealMessage(
					{ text: text.trim(), name: app.status === 'staff' ? (app.myName ?? t.teacher) : '' },
					key,
					targetClassroom,
					message,
					conversation
				);
				const payload: Record<string, string> = creating
					? {
							id: conversation,
							classroom: targetClassroom,
							family: targetFamily,
							title: await sealSubject(subject.trim(), key, targetClassroom, conversation),
							message,
							content
						}
					: { id: message, content };
				pending = { fingerprint, payload };
			}
			const savedId = creating ? pending.payload.id : id!;
			await request('POST', creating ? '/api/messages' : `/api/messages/${id}`, pending.payload);
			text = '';
			pending = undefined;
			await app.loadMessages();
			if (creating) await goto(appPath(data.locale, 'messages', { id: savedId }));
		} catch (cause) {
			failure = errorCode(cause);
			await app.loadMessages();
		} finally {
			busy = false;
		}
	}
	async function close() {
		await request('PUT', `/api/messages/${id}`, { action: 'close' });
		closing = false;
		await app.loadMessages();
	}
</script>

<Screen
	locale={data.locale}
	title={thread?.subject ?? (creating ? t.new : t.title)}
	need="connected"
	back={id || creating ? appPath(data.locale, 'messages') : undefined}
>
	{#if app.messagesError}<p role="alert" class="text-red-700">
			{errorMessage(data.locale, app.messagesError)}
		</p>{/if}
	{#if failure}<p role="alert" class="text-red-700">{errorMessage(data.locale, failure)}</p>{/if}
	{#if id}
		{#if thread}
			<div class="flex flex-wrap items-center justify-between gap-2">
				<p class="text-muted">
					{classroomName(thread.classroom)}{app.status === 'staff'
						? ` · ${familyName(thread.family)}`
						: ''} · {thread.closed ? t.closedStatus : t.openStatus}
				</p>
				{#if app.status === 'staff' && !thread.closed}<button
						class={button.secondary}
						onclick={() => (closing = true)}>{t.close}</button
					>{/if}
			</div>
			{#if more}<button class={button.quiet} disabled={loading} onclick={() => load(id!, true)}
					>{t.older}</button
				>{/if}
			{#if loading}<p role="status">{t.loading}</p>{/if}
			<ol class="grid gap-3" aria-label={t.title}>
				{#each rows as row (row.id)}
					<li class="{surface} min-w-0">
						<div class="mb-2 flex flex-wrap justify-between gap-2 text-sm text-muted">
							<span class="font-semibold"
								>{row.author.startsWith('teacher:') ? row.name || t.teacher : t.parent}</span
							><time datetime={new Date(row.postedAt).toISOString()}>{stamp(row.postedAt)}</time>
						</div>
						<p class="break-words whitespace-pre-wrap">{row.text}</p>
					</li>
				{/each}
			</ol>
			{#if thread.closed}<p>{t.closedCopy}</p>
			{:else}
				{#if app.status === 'family' && policy}<MessagePolicy locale={data.locale} {policy} />{/if}
				<form class="grid gap-3" onsubmit={send}>
					<label class={field.label}
						><span class={field.name}>{t.body}</span><textarea
							class={field.input}
							rows="4"
							required
							maxlength="4000"
							bind:value={text}
							disabled={busy}></textarea></label
					>
					<button class={button.primary} disabled={busy || !canSend || !text.trim()}
						>{t.send}</button
					>
				</form>
			{/if}
		{:else if !app.messagesError}<p>{messages[data.locale].app.notFound.copy}</p>{/if}
	{:else if creating}
		<form class="{surface} grid gap-4" onsubmit={send}>
			<fieldset class="grid gap-4" disabled={busy}>
				<label class={field.label}
					><span>{t.classroom}</span><select class={field.input} required bind:value={classroom}
						><option value="">{t.choose}</option>{#each app.myClassrooms as item}<option
								value={item.id}>{item.name}</option
							>{/each}</select
					></label
				>
				{#if app.status === 'staff'}<label class={field.label}
						><span>{t.family}</span><select class={field.input} required bind:value={family}
							><option value="">{t.choose}</option>{#each families as item}<option value={item.id}
									>{item.name}</option
								>{/each}</select
						></label
					>{/if}
				{#if app.status === 'family' && policy}<MessagePolicy
						locale={data.locale}
						{policy}
						creating
					/>{/if}
				<label class={field.label}
					><span>{t.subject}</span><input
						class={field.input}
						required
						maxlength="120"
						bind:value={subject}
					/></label
				>
				<label class={field.label}
					><span>{t.body}</span><textarea
						class={field.input}
						rows="6"
						required
						maxlength="4000"
						bind:value={text}></textarea></label
				>
				<button
					class={button.primary}
					disabled={!canSend ||
						!classroom ||
						(app.status === 'staff' && !family) ||
						!subject.trim() ||
						!text.trim()}>{t.send}</button
				>
			</fieldset>
		</form>
	{:else}
		<div class="flex flex-wrap gap-2">
			<a class={button.primary} href={appPath(data.locale, 'messages', { new: '1' })}>{t.new}</a
			><button class={button.secondary} onclick={() => app.loadMessages()}>{t.refresh}</button>
		</div>
		<div class="grid gap-3">
			<label class={field.label}
				><span class="sr-only">{t.search}</span><input
					class={field.input}
					type="search"
					placeholder={t.search}
					bind:value={search}
				/></label
			>
			<div class="grid grid-cols-2 gap-3">
				<label class={field.label}
					><span class="sr-only">{t.classroom}</span><select
						class={field.input}
						bind:value={classroom}
						><option value="">{t.classroom}: {t.all}</option>{#each app.myClassrooms as item}<option
								value={item.id}>{item.name}</option
							>{/each}</select
					></label
				>
				<label class={field.label}
					><span class="sr-only">{t.all}</span><select class={field.input} bind:value={filter}
						><option value="all">{t.all}</option><option value="open">{t.open}</option><option
							value="closed">{t.closed}</option
						></select
					></label
				>
			</div>
		</div>
		<ul class="grid gap-3">
			{#each filtered.slice(0, visibleCount) as item (item.id)}
				<li>
					<a
						href={appPath(data.locale, 'messages', { id: item.id })}
						class="{surface} grid gap-2 transition hover:bg-white/80"
					>
						<div class="flex flex-wrap justify-between gap-2">
							<h2 class="text-xl break-words">{item.subject}</h2>
							{#if item.lastSequence > item.readSequence}<span
									class="rounded-full bg-ink px-3 py-1 text-xs text-white">{t.unread}</span
								>{/if}
						</div>
						<p class="line-clamp-2 break-words text-muted">{item.preview}</p>
						<p class="text-sm text-muted">
							{classroomName(item.classroom)}{app.status === 'staff'
								? ` · ${familyName(item.family)}`
								: ''} · {item.closed ? t.closedStatus : t.openStatus} · {stamp(item.postedAt)}
						</p>
					</a>
				</li>
			{:else}<li class="text-muted">{t.empty}</li>{/each}
		</ul>
		{#if filtered.length > visibleCount}<button
				class={button.secondary}
				onclick={() => (visibleCount += 30)}>{t.more}</button
			>{/if}
	{/if}
	<p class="text-sm text-muted">{t.retention}</p>
	{#if closing}<ConfirmDialog
			locale={data.locale}
			title={t.closeTitle}
			copy={t.closeCopy}
			confirmLabel={t.close}
			onconfirm={close}
			onclose={() => (closing = false)}
		/>{/if}
</Screen>
