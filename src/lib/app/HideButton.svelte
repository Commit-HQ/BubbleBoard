<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import type { OpenEvent } from '$lib/events/types';
	import { messages, type Locale } from '$lib/i18n';
	import type { Notice } from '$lib/notices';
	import { getApp } from './state.svelte';
	import { button } from './ui';

	// Hides a notice or event from the board on this device, or, in Hidden at the board's bottom, shows it
	// there again. It sits at the right end of the card's last row.
	let { locale, post }: { locale: Locale; post: Notice | OpenEvent } = $props();
	const app = getApp();
	const t = $derived(messages[locale].app.notices);
	const hidden = $derived(app.isHidden(post));
</script>

<button
	class="{button.quiet} -mr-3 ml-auto"
	type="button"
	onclick={() => app.setHidden(post, !hidden)}
>
	<Icon name={hidden ? 'eye' : 'eyeOff'} class="size-4" />{hidden ? t.unhide : t.hide}
</button>
