<script lang="ts">
	import { errorMessage, messages, type Locale } from '$lib/i18n';
	import { onMount } from 'svelte';
	import { Task } from './state.svelte';
	import { alert, button, modal } from './ui';

	// A question before a change that can't be taken back. It opens when mounted and runs its own change,
	// staying open with the error if that fails. `onclose` runs when it closes, by Escape, Cancel, or the
	// parent removing it. With `safe`, cancelling is the main action.
	let {
		locale,
		title,
		copy,
		confirmLabel,
		cancelLabel,
		busyLabel,
		danger = false,
		safe = false,
		onconfirm,
		onclose
	}: {
		locale: Locale;
		title: string;
		copy: string;
		confirmLabel: string;
		cancelLabel?: string;
		busyLabel?: string;
		danger?: boolean;
		safe?: boolean;
		onconfirm: () => Promise<unknown>;
		onclose: () => void;
	} = $props();

	const t = $derived(messages[locale].app.actions);
	const id = $props.id();
	const task = new Task();
	let dialog = $state<HTMLDialogElement>();
	onMount(() => dialog?.showModal());

	const confirmClass = $derived(
		danger ? button.dangerSolid : safe ? button.secondary : button.primary
	);
</script>

<dialog
	bind:this={dialog}
	class="{modal} p-7"
	aria-labelledby="{id}-title"
	aria-describedby="{id}-copy"
	{onclose}
>
	<h2 id="{id}-title" class="text-3xl">{title}</h2>
	<p id="{id}-copy" class="mt-3 text-muted">{copy}</p>
	{#if task.error}<p class="{alert} mt-4" role="alert">{errorMessage(locale, task.error)}</p>{/if}
	<div class="mt-7 flex flex-wrap justify-end gap-2">
		<button
			class={safe ? button.primary : button.quiet}
			type="button"
			onclick={() => dialog?.close()}>{cancelLabel ?? t.cancel}</button
		>
		<button
			class={confirmClass}
			type="button"
			disabled={task.busy}
			onclick={() => task.run(onconfirm)}
		>
			{task.busy ? (busyLabel ?? t.working) : confirmLabel}
		</button>
	</div>
</dialog>
