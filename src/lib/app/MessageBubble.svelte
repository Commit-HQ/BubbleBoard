<script lang="ts">
	import type { Locale } from '$lib/i18n';
	import { messageTime, type OpenMessage } from '$lib/messages';

	// One message in a conversation. What this device wrote sits on the right in ink, the other side's on the
	// left on white, as in the chats families already use. The name above says which teacher wrote it.
	let {
		locale,
		message,
		mine,
		name
	}: { locale: Locale; message: OpenMessage; mine: boolean; name?: string } = $props();
</script>

<li class="flex {mine ? 'justify-end' : 'justify-start'}">
	<div
		class="max-w-[85%] min-w-0 rounded-3xl px-4 py-3 {mine
			? 'rounded-br-md bg-ink text-white'
			: 'rounded-bl-md bg-white text-ink ring-1 ring-ink/5'} shadow-sm shadow-ink/5"
	>
		{#if name}
			<p class="mb-0.5 text-sm font-bold {mine ? 'text-white/75' : 'text-accent'}">{name}</p>
		{/if}
		<p class="break-words whitespace-pre-wrap">{message.text}</p>
		<time
			class="mt-1 block text-right text-xs {mine ? 'text-white/75' : 'text-muted'}"
			datetime={new Date(message.postedAt).toISOString()}
		>
			{messageTime(locale, message.postedAt)}
		</time>
	</div>
</li>
