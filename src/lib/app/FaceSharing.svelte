<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { messages, type Locale } from '$lib/i18n';
	import { choice, field } from './ui';

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

{#snippet option(value: boolean, label: string, hint: string)}
	<label class={choice.card}>
		<input
			class="sr-only"
			type="radio"
			{name}
			{disabled}
			checked={share === value}
			onchange={() => {
				share = value;
				onchange?.(value);
			}}
		/>
		<span class={choice.circle}><Icon name="check" class={choice.check} /></span>
		<span>
			<span class="block font-semibold">{label}</span>
			<span class={field.hint}>{hint}</span>
		</span>
	</label>
{/snippet}

<fieldset class="grid gap-2">
	<legend class="font-semibold">{t.title}</legend>
	<p class="mb-1 text-sm text-muted">{t.hint}</p>
	{@render option(false, t.covered, t.coveredHint)}
	{@render option(true, t.shared, t.sharedHint)}
</fieldset>
