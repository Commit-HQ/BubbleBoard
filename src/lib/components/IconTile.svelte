<script lang="ts">
	import Icon, { type IconName } from './Icon.svelte';

	// An icon on a rounded tile: the brand gradient, ink in quieter places, or white beside steps to follow.
	let { icon, tone = 'sunrise' }: { icon: IconName; tone?: 'sunrise' | 'ink' | 'white' } = $props();
	const tones = {
		sunrise: 'bg-sunrise text-white',
		ink: 'bg-ink text-white',
		white: 'bg-white/80 text-ink ring-1 ring-ink/10'
	};
</script>

<span class="grid size-11 shrink-0 place-items-center rounded-2xl {tones[tone]}">
	<Icon name={icon} />
</span>
