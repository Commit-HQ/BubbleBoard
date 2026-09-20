<script lang="ts">
	import { onMount } from 'svelte';
	import { request } from '$lib/api';
	import { fields, decryptData, encryptData } from '$lib/crypto';
	import type { ConsentSnapshot, ConsentRow } from '$lib/events/types';
	import { messages, errorMessage, type Locale } from '$lib/i18n';
	import { getApp, Task } from './state.svelte';
	import { surface, button, alert, field } from './ui';
	let { locale }: { locale: Locale } = $props();
	const app = getApp(),
		task = new Task();
	const t = $derived(messages[locale].app.events);
	let rows = $state<(ConsentRow & { name: string; share: boolean })[]>([]);
	let loaded = $state(false);
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
		});
		if (task.error === 'stale') await load();
	}
</script>

<section class="{surface} grid gap-4">
	<h2 class="text-3xl">{t.consentTitle}</h2>
	<p class="text-muted">{t.consentHint}</p>
	{#if task.error}<p role="alert" class={alert}>{errorMessage(locale, task.error)}</p>{/if}
	{#if loaded && !rows.length}<p>{t.noChildren}</p>{/if}
	{#each rows as row (row.child)}
		<label class={field.label}
			><span class="font-semibold">{row.name}</span><select
				class={field.input}
				value={String(row.share)}
				disabled={task.busy}
				onchange={(event) => save(row, event.currentTarget.value === 'true')}
				><option value="false">{t.private}</option><option value="true">{t.group}</option></select
			></label
		>
	{/each}
	<button
		class="{button.quiet} justify-self-start"
		type="button"
		disabled={task.busy}
		onclick={() => task.run(load)}>{t.reload}</button
	>
</section>
