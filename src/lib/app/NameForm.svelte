<script lang="ts">
	import { onMount } from 'svelte';
	import { alert, button, field, formText } from './ui';

	// One name to add or change: a classroom, a child, or the name on a card.
	let {
		label,
		value = '',
		hint,
		placeholder,
		submitLabel,
		cancelLabel,
		busy = false,
		error,
		onsubmit,
		oncancel
	}: {
		label: string;
		value?: string;
		hint?: string;
		placeholder?: string;
		submitLabel: string;
		cancelLabel?: string;
		busy?: boolean;
		error?: string;
		onsubmit: (name: string) => void;
		oncancel?: () => void;
	} = $props();

	let input = $state<HTMLInputElement>();
	// The form opens when someone asks for it, so typing can start right away.
	onMount(() => input?.focus());

	function submit(event: SubmitEvent & { currentTarget: EventTarget & HTMLFormElement }) {
		event.preventDefault();
		const name = formText(new FormData(event.currentTarget), 'name');
		if (name) onsubmit(name);
	}
</script>

<form class="grid gap-3" onsubmit={submit}>
	<label class={field.label}>
		<span class={field.name}>{label}</span>
		<input
			bind:this={input}
			class={field.input}
			name="name"
			{value}
			{placeholder}
			required
			maxlength="80"
			autocomplete="off"
		/>
		{#if hint}<span class={field.hint}>{hint}</span>{/if}
	</label>
	{#if error}<p class={alert} role="alert">{error}</p>{/if}
	<div class="flex flex-wrap gap-2">
		<button class={button.primary} type="submit" disabled={busy}>{submitLabel}</button>
		{#if oncancel}
			<button class={button.quiet} type="button" onclick={oncancel}>{cancelLabel}</button>
		{/if}
	</div>
</form>
