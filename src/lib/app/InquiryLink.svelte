<script lang="ts">
	import { listRow } from './ui';

	// One conversation in the inbox: who it's with, its subject, the last thing said, and when. A conversation
	// with something new on it stands out, as an unseen notice does on the board.
	let {
		href,
		initial,
		subject,
		preview,
		detail,
		time,
		unread,
		unreadLabel
	}: {
		href: string;
		initial: string;
		subject: string;
		preview: string;
		detail: string;
		time: string;
		unread: boolean;
		unreadLabel: string;
	} = $props();
</script>

<li>
	<a class="{listRow} {unread ? 'ring-2 ring-accent' : ''}" {href}>
		<span
			class="grid size-11 shrink-0 place-items-center rounded-2xl text-lg font-bold {unread
				? 'bg-sunrise text-white'
				: 'bg-white/80 text-ink ring-1 ring-ink/10'}"
			aria-hidden="true">{initial}</span
		>
		<span class="min-w-0 grow">
			<span class="flex items-baseline justify-between gap-3">
				<span class="min-w-0 truncate font-bold">{subject}</span>
				<span class="shrink-0 text-xs text-muted">{time}</span>
			</span>
			<span class="mt-0.5 block truncate text-sm text-muted">{preview}</span>
			{#if detail}<span class="mt-1 block truncate text-xs text-muted">{detail}</span>{/if}
		</span>
		{#if unread}
			<span class="size-2.5 shrink-0 rounded-full bg-accent"></span>
			<span class="sr-only">{unreadLabel}</span>
		{/if}
	</a>
</li>
