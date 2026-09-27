<script lang="ts">
	import Icon, { type IconName } from '$lib/components/Icon.svelte';
	import IconTile from '$lib/components/IconTile.svelte';
	import { listRow, tag as tagStyle } from './ui';

	// A record in a list, linking to its page. An icon sets apart a record unlike the others, and a tag says
	// one short thing about it at a glance, such as whether a child's face is covered.
	let {
		href,
		title,
		detail,
		icon,
		tag
	}: {
		href: string;
		title: string;
		detail: string;
		icon?: IconName;
		tag?: { icon: IconName; label: string; tone?: 'good' };
	} = $props();
</script>

<li>
	<a class={listRow} {href}>
		{#if icon}<IconTile {icon} tone="ink" />{/if}
		<span class="min-w-0 grow">
			<span class="block font-bold">{title}</span>
			<span class="block text-sm text-muted">{detail}</span>
		</span>
		{#if tag}
			<span class={tag.tone === 'good' ? tagStyle.good : tagStyle.plain}>
				<Icon name={tag.icon} class="size-3.5" />{tag.label}
			</span>
		{/if}
		<Icon name="chevronRight" class="size-5 shrink-0 text-muted" />
	</a>
</li>
