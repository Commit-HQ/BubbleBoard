<script lang="ts">
	import { errorMessage, messages, type Locale } from '$lib/i18n';
	import { onMount } from 'svelte';
	import { Task } from './state.svelte';
	import { alert, button, field, formText } from './ui';

	// One value to add or change: a name, or with `options`, a choice such as the classroom to move to. It
	// runs its own change, so it opens without an earlier error and stays open while a change fails.
	let {
		locale,
		label,
		value = '',
		hint,
		placeholder,
		options,
		submitLabel,
		onsubmit,
		oncancel
	}: {
		locale: Locale;
		label: string;
		value?: string;
		hint?: string;
		placeholder?: string;
		options?: { value: string; label: string }[];
		submitLabel: string;
		onsubmit: (value: string) => Promise<unknown>;
		oncancel: () => void;
	} = $props();

	const t = $derived(messages[locale].app.actions);
	const task = new Task();
	let input = $state<HTMLInputElement | HTMLSelectElement>();
	// The form opens when someone asks for it, so typing can start right away.
	onMount(() => input?.focus());

	function submit(event: SubmitEvent & { currentTarget: EventTarget & HTMLFormElement }) {
		event.preventDefault();
		const entered = formText(new FormData(event.currentTarget), 'value');
		if (entered) task.run(() => onsubmit(entered));
	}
</script>

<form class="grid gap-3" onsubmit={submit}>
	<label class={field.label}>
		<span class={field.name}>{label}</span>
		{#if options}
			<select bind:this={input} class={field.input} name="value">
				{#each options as option (option.value)}
					<option value={option.value}>{option.label}</option>
				{/each}
			</select>
		{:else}
			<input
				bind:this={input}
				class={field.input}
				name="value"
				{value}
				{placeholder}
				required
				maxlength="80"
				autocomplete="off"
			/>
		{/if}
		{#if hint}<span class={field.hint}>{hint}</span>{/if}
	</label>
	{#if task.error}<p class={alert} role="alert">{errorMessage(locale, task.error)}</p>{/if}
	<div class="flex flex-wrap gap-2">
		<button class={button.primary} type="submit" disabled={task.busy}>{submitLabel}</button>
		<button class={button.quiet} type="button" onclick={oncancel}>{t.cancel}</button>
	</div>
</form>
