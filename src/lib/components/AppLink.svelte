<script lang="ts">
	import type { Messages } from '$lib/i18n/en';

	// Entry point to the installed app. The app isn't built yet, so for now this shows its status
	// instead of linking anywhere; it becomes a link once the app route exists.
	let { labels, class: className = '' }: { labels: Messages['app']; class?: string } = $props();
</script>

<span
	class="items-center gap-2 rounded-full bg-ink font-semibold whitespace-nowrap text-white shadow-xl shadow-ink/20 {className}"
	role="link"
	aria-disabled="true"
>
	{labels.open}
	<span class="font-normal text-white/65">· {labels.soon}</span>
</span>
