<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { choice, field } from './ui';

	// A checkbox drawn as a card, with a line under its label when it needs one. With a `name`, the form it's
	// in reads it when submitted.
	let {
		label,
		hint,
		name,
		checked = $bindable(false)
	}: { label: string; hint?: string; name?: string; checked?: boolean } = $props();
</script>

<label class={choice.card}>
	<input class="sr-only" type="checkbox" {name} bind:checked />
	<span class={choice.box}><Icon name="check" class={choice.check} /></span>
	<span>
		<span class="block font-semibold">{label}</span>
		{#if hint}<span class={field.hint}>{hint}</span>{/if}
	</span>
</label>
