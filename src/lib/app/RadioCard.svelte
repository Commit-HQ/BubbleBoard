<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { choice, field } from './ui';

	// A radio drawn as a card, the one-of-several counterpart to CheckCard.svelte. Every card of one choice
	// shares a `name`, which is how the browser groups them.
	let {
		label,
		hint,
		name,
		checked = false,
		disabled = false,
		onchange
	}: {
		label: string;
		hint?: string;
		name: string;
		checked?: boolean;
		disabled?: boolean;
		onchange?: () => void;
	} = $props();
</script>

<label class={choice.card}>
	<input class="sr-only" type="radio" {name} {disabled} {checked} onchange={() => onchange?.()} />
	<span class={choice.circle}><Icon name="check" class={choice.check} /></span>
	<span>
		<span class="block font-semibold">{label}</span>
		{#if hint}<span class={field.hint}>{hint}</span>{/if}
	</span>
</label>
