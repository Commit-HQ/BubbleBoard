<script lang="ts">
	import type { NoticeFile } from '$lib/files';
	import { messages, type Locale } from '$lib/i18n';
	import { messageTime, type OpenMessage } from '$lib/messages';
	import Attachments from './Attachments.svelte';
	import type { Picture } from './state.svelte';

	// One message in a conversation. What this device wrote sits on the right in ink, the other side's on the
	// left on white, as in the chats families already use. The name above says which teacher wrote it, and a
	// teacher's files follow its words, in ink whichever side the bubble is on. A message its author has
	// changed says so beside its time; a deleted one keeps its place and says only that it's gone.
	let {
		locale,
		message,
		mine,
		name,
		openPicture,
		saveDocument,
		onedit,
		onremove
	}: {
		locale: Locale;
		message: OpenMessage;
		mine: boolean;
		name?: string;
		/** One of the message's pictures, fetched and opened. */
		openPicture: (file: NoticeFile) => Promise<Picture>;
		/** Fetches and opens one of its documents, and saves it on this device. */
		saveDocument: (file: NoticeFile) => Promise<void>;
		/** Changing and deleting this message, each offered only where the viewer may still do it. */
		onedit?: () => void;
		onremove?: () => void;
	} = $props();
	const t = $derived(messages[locale].app.messaging);
	const quiet = $derived(mine ? 'text-white/75' : 'text-muted');
</script>

<li class="flex {mine ? 'justify-end' : 'justify-start'}">
	<div
		class="max-w-[85%] min-w-0 rounded-3xl px-4 py-3 {mine
			? 'rounded-br-md bg-ink text-white'
			: 'rounded-bl-md bg-white text-ink ring-1 ring-ink/5'} shadow-sm shadow-ink/5"
	>
		{#if message.deletedAt}
			<p class="break-words italic {quiet}">{t.deletedMessage}</p>
		{:else}
			{#if name}
				<p class="mb-0.5 text-sm font-bold {mine ? 'text-white/75' : 'text-accent'}">{name}</p>
			{/if}
			<p class="break-words whitespace-pre-wrap">{message.text}</p>
			{#if message.files?.length}
				<div class="mt-3 text-ink">
					<Attachments {locale} files={message.files} compact {openPicture} {saveDocument} />
				</div>
			{/if}
		{/if}
		<div class="mt-1 flex flex-wrap items-center justify-end gap-2 text-xs {quiet}">
			{#if onedit}
				<button class="font-semibold underline" type="button" onclick={onedit}>
					{t.editMessage}
				</button>
			{/if}
			{#if onremove}
				<button class="font-semibold underline" type="button" onclick={onremove}>
					{t.removeMessage}
				</button>
			{/if}
			{#if message.editedAt && !message.deletedAt}<span>{t.edited}</span>{/if}
			<time datetime={new Date(message.postedAt).toISOString()}>
				{messageTime(locale, message.postedAt)}
			</time>
		</div>
	</div>
</li>
