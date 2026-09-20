<script lang="ts">
	import { onMount } from 'svelte';
	import { request } from '$lib/api';
	import { fields, decryptData, encryptData } from '$lib/crypto';
	import type { ConsentSnapshot, ConsentRow } from '$lib/events/types';
	import { messages, errorMessage, type Locale } from '$lib/i18n';
	import Icon from '$lib/components/Icon.svelte';
	import IconTile from '$lib/components/IconTile.svelte';
	import { getApp, Task } from './state.svelte';
	import { surface, alert, choice, field } from './ui';

	// Whether the families of a classroom may see a child's face in the photos of its events, decided by the
	// family, one card for each of its children. The choice is encrypted with the family's own key, so only
	// the family and staff read it, and it applies to what is published from then on.
	let { locale }: { locale: Locale } = $props();
	const app = getApp(),
		task = new Task();
	const t = $derived(messages[locale].app.events);
	const id = $props.id();
	let rows = $state<(ConsentRow & { name: string; share: boolean })[]>([]);
	let loaded = $state(false);
	let saved = $state(false);

	async function load() {
		const data = await request<ConsentSnapshot>('GET', '/api/photo-consent');
		const key = await app.messageKey(app.messageFamily!);
		rows = await Promise.all(
			data.rows.map(async (row) => {
				let name = t.child,
					share = false;
				try {
					const label = fields(
						await decryptData(row.label, key, {
							purpose: 'photo-label',
							event: row.child,
							part: row.family
						})
					);
					if (typeof label.name === 'string') name = label.name;
				} catch {}
				try {
					if (row.choice)
						share =
							fields(
								await decryptData(row.choice, key, {
									purpose: 'photo-choice',
									event: row.child,
									part: row.family
								})
							).share === true;
				} catch {}
				return { ...row, name, share };
			})
		);
		loaded = true;
	}
	onMount(() => {
		void task.run(load);
	});
	async function save(row: (typeof rows)[number], share: boolean) {
		if (row.share === share) return;
		saved = false;
		await task.run(async () => {
			const choice = await encryptData({ share }, await app.messageKey(row.family), {
				purpose: 'photo-choice',
				event: row.child,
				part: row.family
			});
			await request('PUT', '/api/photo-consent', {
				child: row.child,
				revision: row.revision,
				choice
			});
			await load();
			saved = true;
		});
		if (task.error === 'stale') await load();
	}
</script>

{#snippet option(row: (typeof rows)[number], value: boolean, label: string, hint: string)}
	<label class={choice.card}>
		<input
			class="sr-only"
			type="radio"
			name="{id}-{row.child}"
			checked={row.share === value}
			disabled={task.busy}
			onchange={() => save(row, value)}
		/>
		<span class={choice.circle}><Icon name="check" class={choice.check} /></span>
		<span>
			<span class="block font-semibold">{label}</span>
			<span class={field.hint}>{hint}</span>
		</span>
	</label>
{/snippet}

<section class={surface} aria-labelledby="{id}-title">
	<IconTile icon="smile" tone="ink" />
	<h2 id="{id}-title" class="mt-5 text-3xl">{t.consentTitle}</h2>
	<p class="mt-1 text-muted">{t.consentHint}</p>
	<div class="mt-6 grid gap-6">
		{#if task.error}<p role="alert" class={alert}>{errorMessage(locale, task.error)}</p>{/if}
		{#if loaded && !rows.length}<p class="text-muted">{t.noChildren}</p>{/if}
		{#each rows as row (row.child)}
			<fieldset class="grid gap-2">
				<legend class="mb-2 font-semibold">{row.name}</legend>
				{@render option(row, false, t.private, t.privateHint)}
				{@render option(row, true, t.group, t.groupHint)}
			</fieldset>
		{/each}
		{#if saved && !task.error}
			<p class="font-semibold text-muted" role="status">{t.consentSaved}</p>
		{/if}
	</div>
</section>
