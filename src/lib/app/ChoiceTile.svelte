<script lang="ts">
	import Icon, { type IconName } from '$lib/components/Icon.svelte';
	import IconTile from '$lib/components/IconTile.svelte';
	import { choice } from './ui';

	// A radio drawn as a tile: an icon, a title, and a line under it when there's more to say.
	let {
		name,
		value,
		checked,
		onchange,
		icon,
		title,
		detail
	}: {
		name: string;
		value: string;
		checked: boolean;
		onchange: () => void;
		icon: IconName;
		title: string;
		detail?: string;
	} = $props();
</script>

<label class={choice.tile}>
	<input class="sr-only" type="radio" {name} {value} {checked} {onchange} />
	<span class="flex items-start justify-between gap-2">
		<IconTile {icon} />
		<span class={choice.circle}><Icon name="check" class={choice.check} /></span>
	</span>
	<span class="mt-auto min-w-0">
		<span class="block leading-snug font-bold">{title}</span>
		{#if detail}<span class="block text-sm text-muted">{detail}</span>{/if}
	</span>
</label>
