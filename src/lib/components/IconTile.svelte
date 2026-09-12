<script lang="ts">
	import Icon, { type IconName } from './Icon.svelte';

	// An icon on a rounded tile: the brand gradient, or ink in quieter places.
	let { icon, tone = 'sunrise' }: { icon: IconName; tone?: 'sunrise' | 'ink' } = $props();
</script>

<span
	class="grid size-11 shrink-0 place-items-center rounded-2xl text-white {tone === 'ink'
		? 'bg-ink'
		: 'bg-sunrise'}"
>
	<Icon name={icon} />
</span>
