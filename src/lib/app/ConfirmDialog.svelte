<script lang="ts">
	import { onMount } from 'svelte';
	import { alert, button } from './ui';

	// A question before a change that can't be taken back. It opens when mounted; `onclose` runs when it
	// closes, by Escape, Cancel, or the parent removing it. With `safe`, cancelling is the main action.
	let {
		title,
		copy,
		confirmLabel,
		cancelLabel,
		busyLabel,
		danger = false,
		safe = false,
		busy = false,
		error,
		onconfirm,
		onclose
	}: {
		title: string;
		copy?: string;
		confirmLabel: string;
		cancelLabel: string;
		busyLabel?: string;
		danger?: boolean;
		safe?: boolean;
		busy?: boolean;
		error?: string;
		onconfirm: () => void;
		onclose: () => void;
	} = $props();

	const id = $props.id();
	let dialog = $state<HTMLDialogElement>();
	onMount(() => dialog?.showModal());

	const confirmClass = $derived(
		danger ? button.dangerSolid : safe ? button.secondary : button.primary
	);
</script>

<dialog
	bind:this={dialog}
	class="m-auto w-[calc(100%-2rem)] max-w-md rounded-4xl bg-white p-7 text-ink shadow-2xl shadow-indigo-950/25 backdrop:bg-ink/30"
	aria-labelledby="{id}-title"
	aria-describedby={copy ? `${id}-copy` : undefined}
	{onclose}
>
	<h2 id="{id}-title" class="text-3xl">{title}</h2>
	{#if copy}<p id="{id}-copy" class="mt-3 text-muted">{copy}</p>{/if}
	{#if error}<p class="{alert} mt-4" role="alert">{error}</p>{/if}
	<div class="mt-7 flex flex-wrap justify-end gap-2">
		<button
			class={safe ? button.primary : button.quiet}
			type="button"
			onclick={() => dialog?.close()}>{cancelLabel}</button
		>
		<button class={confirmClass} type="button" disabled={busy} onclick={onconfirm}>
			{busy && busyLabel ? busyLabel : confirmLabel}
		</button>
	</div>
</dialog>
