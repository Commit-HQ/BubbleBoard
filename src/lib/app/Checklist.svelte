<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { messages, type Locale } from '$lib/i18n';
	import { choice, labelFocus } from './ui';

	// Checkboxes drawn as cards under a label, such as a notice's classrooms, with Select all beside the
	// label when there are several to choose from. A `disabled` list shows a choice that can't change, such
	// as the only classroom a notice can go to, without Select all.
	let {
		locale,
		label,
		options,
		disabled = false,
		chosen = $bindable()
	}: {
		locale: Locale;
		label: string;
		options: { value: string; label: string; detail?: string }[];
		disabled?: boolean;
		chosen: string[];
	} = $props();

	const t = $derived(messages[locale].app.actions);
	const id = $props.id();
	const allChosen = $derived(options.every((option) => chosen.includes(option.value)));
</script>

<div class="grid gap-3" role="group" aria-labelledby="{id}-label">
	<div class="flex flex-wrap items-center justify-between gap-x-4">
		<span id="{id}-label" class="font-semibold">{label}</span>
		{#if options.length > 1 && !disabled}
			<label
				class="group inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full font-semibold text-muted transition-colors hover:text-ink {labelFocus}"
			>
				<input
					class="sr-only"
					type="checkbox"
					checked={allChosen}
					onchange={(event) =>
						(chosen = event.currentTarget.checked ? options.map((option) => option.value) : [])}
				/>
				<span class={choice.box}><Icon name="check" class={choice.check} /></span>
				{t.selectAll}
			</label>
		{/if}
	</div>
	<div class="grid gap-2 sm:grid-cols-2">
		{#each options as option (option.value)}
			<label class={choice.card}>
				<input
					class="sr-only"
					type="checkbox"
					value={option.value}
					{disabled}
					bind:group={chosen}
				/>
				<span class={choice.box}><Icon name="check" class={choice.check} /></span>
				<span class="min-w-0">
					<span class="block font-semibold">{option.label}</span>
					{#if option.detail}<span class="block text-sm text-muted">{option.detail}</span>{/if}
				</span>
			</label>
		{/each}
	</div>
</div>
