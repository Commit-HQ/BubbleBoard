<script lang="ts">
	import RadioCard from './RadioCard.svelte';
	import { messages, type Locale } from '$lib/i18n';

	// Whether a classroom's other families may see a child's face in event photos, as staff record it from
	// the family's consent form. Families set the same choice themselves (PhotoConsent.svelte), and it is
	// stored for every family card linked to the child, because sharing needs all of them to allow it.
	let {
		locale,
		name,
		share = $bindable(),
		disabled = false,
		onchange
	}: {
		locale: Locale;
		name: string;
		share: boolean;
		disabled?: boolean;
		onchange?: (share: boolean) => void;
	} = $props();
	const t = $derived(messages[locale].app.sharing);
</script>

<fieldset class="grid gap-2">
	<legend class="font-semibold">{t.title}</legend>
	<p class="mb-1 text-sm text-muted">{t.hint}</p>
	{#each [[false, t.covered, t.coveredHint], [true, t.shared, t.sharedHint]] as const as [value, label, hint]}
		<RadioCard
			{label}
			{hint}
			{name}
			{disabled}
			checked={share === value}
			onchange={() => {
				share = value;
				onchange?.(value);
			}}
		/>
	{/each}
</fieldset>
