<script module lang="ts">
	/**
	 * What a conversation's tile shows. A family's report of an event's photos has a red flag. On a staff
	 * device, an inquiry shows the initials of the family's children, in a colour that stays the child's, with
	 * a dot while the family waits for an answer. On a family device it shows whose turn it is: a clock while
	 * the family's own message waits for the teachers, and a message once a teacher has written. A closed
	 * inquiry waits for nobody: it has a tick, and no dot on a staff device. Names would say little there,
	 * since teachers often go by "Teta Martina": the preview line carries the name. `label` says, for screen
	 * readers, what the tile shows when it says anything.
	 */
	export type Tile = { label?: string } & (
		| { kind: 'report' }
		| { kind: 'children'; letters: string; tone: number; waiting: boolean }
		| { kind: 'waiting' }
		| { kind: 'answered' }
		| { kind: 'closed' }
	);
	/** Soft colours a child's tile takes, chosen by the child, so the same child looks the same everywhere. */
	const tones = [
		'bg-sky-100 text-sky-900',
		'bg-amber-100 text-amber-900',
		'bg-violet-100 text-violet-900',
		'bg-emerald-100 text-emerald-900',
		'bg-rose-100 text-rose-900',
		'bg-teal-100 text-teal-900'
	];
	/** A child's colour, from its ID, which is random, so the colours spread evenly. */
	export function toneOf(id: string) {
		let sum = 0;
		for (const character of id) sum += character.charCodeAt(0);
		return sum % tones.length;
	}
</script>

<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { listRow } from './ui';

	// One conversation in the inbox: its tile, its subject, the last thing said and by whom, and when. A
	// conversation with something new on it stands out, as an unseen notice does on the board.
	let {
		href,
		tile,
		subject,
		preview,
		detail,
		time,
		unread,
		unreadLabel
	}: {
		href: string;
		tile: Tile;
		subject: string;
		preview: string;
		detail: string;
		time: string;
		unread: boolean;
		unreadLabel: string;
	} = $props();
</script>

<!-- The list is a grid, whose rows would otherwise grow as wide as the longest line they cut short. -->
<li class="min-w-0">
	<a class="{listRow} {unread ? 'ring-2 ring-accent' : ''}" {href}>
		<span
			class="relative grid size-11 shrink-0 place-items-center rounded-2xl {{
				report: 'bg-red-50 text-red-700 ring-1 ring-red-200',
				children: `text-lg font-bold ${tile.kind === 'children' ? tones[tile.tone] : ''}`,
				waiting: 'bg-amber-100 text-amber-900',
				closed: 'bg-emerald-100 text-emerald-800',
				answered: 'bg-sunrise text-white'
			}[tile.kind]}"
			aria-hidden="true"
		>
			{#if tile.kind === 'report'}
				<Icon name="flag" class="size-5" />
			{:else if tile.kind === 'children'}
				{tile.letters}
				{#if tile.waiting}
					<span class="absolute -top-1 -right-1 size-3.5 rounded-full bg-apricot ring-2 ring-white"
					></span>
				{/if}
			{:else if tile.kind === 'waiting'}
				<Icon name="clock" class="size-5" />
			{:else if tile.kind === 'closed'}
				<Icon name="check" class="size-5" />
			{:else}
				<Icon name="message" class="size-5" />
			{/if}
		</span>
		{#if tile.label}<span class="sr-only">{tile.label}</span>{/if}
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
