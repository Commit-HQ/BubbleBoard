<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';

	let { href, title, detail }: { href: string; title: string; detail: string } = $props();
</script>

<li>
	<a
		class="flex items-center justify-between gap-4 rounded-3xl glass px-5 py-4 transition hover:bg-white/75"
		{href}
	>
		<span class="min-w-0">
			<span class="block font-bold">{title}</span>
			<span class="block text-sm text-muted">{detail}</span>
		</span>
		<Icon name="chevronRight" class="size-5 shrink-0 text-muted" />
	</a>
</li>
