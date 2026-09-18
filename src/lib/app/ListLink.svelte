<script lang="ts">
	import Icon, { type IconName } from '$lib/components/Icon.svelte';
	import IconTile from '$lib/components/IconTile.svelte';
	import { listRow } from './ui';

	// A record in a list, linking to its page. An icon sets apart a record unlike the others.
	let {
		href,
		title,
		detail,
		icon
	}: { href: string; title: string; detail: string; icon?: IconName } = $props();
</script>

<li>
	<a class={listRow} {href}>
		{#if icon}<IconTile {icon} tone="ink" />{/if}
		<span class="min-w-0 grow">
			<span class="block font-bold">{title}</span>
			<span class="block text-sm text-muted">{detail}</span>
		</span>
		<Icon name="chevronRight" class="size-5 shrink-0 text-muted" />
	</a>
</li>
