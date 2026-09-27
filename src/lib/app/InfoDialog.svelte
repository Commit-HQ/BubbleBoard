<script lang="ts">
	import { messages, type Locale } from '$lib/i18n';
	import type { Snippet } from 'svelte';
	import { onMount } from 'svelte';
	import { button, modal } from './ui';

	// A dialog that only shows something, such as a list, with Done to close it. It opens when mounted, as
	// ConfirmDialog does, and `onclose` runs when it closes.
	let {
		locale,
		title,
		hint,
		onclose,
		children
	}: { locale: Locale; title: string; hint: string; onclose: () => void; children: Snippet } =
		$props();
	const id = $props.id();
	let dialog = $state<HTMLDialogElement>();
	onMount(() => dialog?.showModal());
</script>

<dialog
	bind:this={dialog}
	class="{modal} p-7"
	aria-labelledby="{id}-title"
	aria-describedby="{id}-hint"
	{onclose}
>
	<h2 id="{id}-title" class="text-3xl">{title}</h2>
	<p id="{id}-hint" class="mt-3 text-sm text-muted">{hint}</p>
	{@render children()}
	<div class="mt-7 flex justify-end">
		<button class={button.secondary} type="button" onclick={() => dialog?.close()}>
			{messages[locale].app.actions.done}
		</button>
	</div>
</dialog>
