<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { messages, type Locale } from '$lib/i18n';

	// A small pill beside a child's name: whether the classroom's other families see the child's face.
	let { locale, visible }: { locale: Locale; visible: boolean } = $props();
	const t = $derived(messages[locale].app.classroom);
</script>

<span
	class="inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold {visible
		? 'bg-green-50 text-green-800'
		: 'bg-ink/5 text-muted'}"
>
	<Icon name={visible ? 'eye' : 'lock'} class="size-3.5" />{visible ? t.faceShown : t.faceCovered}
</span>
