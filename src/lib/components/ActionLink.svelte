<script lang="ts">
	import Icon, { type IconName } from './Icon.svelte';

	// A landing page's main action: an ink pill with its icon in a white circle.
	let { href, label, icon }: { href: string; label: string; icon: IconName } = $props();
</script>

<a
	class="inline-flex items-center gap-3 rounded-full bg-ink py-2 pr-2 pl-6 font-semibold text-white shadow-xl shadow-ink/30 hover:-translate-y-0.5 motion-safe:transition-transform"
	{href}
>
	{label}
	<span class="grid size-9 shrink-0 place-items-center rounded-full bg-white text-ink">
		<Icon name={icon} class="size-4" />
	</span>
</a>
