<script lang="ts">
	import { untrack } from 'svelte';
	import { request } from '$lib/api';
	import { errorCode } from '$lib/errors';
	import { errorMessage, messages, type Locale } from '$lib/i18n';
	import { defaultSchedule, type MessageSettings } from '$lib/messages';
	import { getApp } from './state.svelte';
	import { button, field, surface } from './ui';
	let { locale, settings }: { locale: Locale; settings: MessageSettings } = $props();
	const app = getApp();
	const t = $derived(messages[locale].app.messaging);
	let enabled = $state(untrack(() => settings.enabled));
	let limit = $state(untrack(() => settings.monthlyLimit));
	let schedule = $state(
		untrack(() =>
			settings.schedule.map((day, index) => ({
				active: !!day,
				...(day ?? defaultSchedule()[index]!)
			}))
		)
	);
	let revision = $state(untrack(() => settings.revision));
	let busy = $state(false);
	let failure = $state<string>();
	let saved = $state(false);
	async function save(event: SubmitEvent) {
		event.preventDefault();
		busy = true;
		failure = undefined;
		saved = false;
		try {
			await request('PUT', `/api/classrooms/${settings.classroom}/messages`, {
				enabled,
				monthlyLimit: limit,
				revision,
				schedule: schedule.map(({ active, start, end }) => (active ? { start, end } : null))
			});
			revision++;
			saved = true;
			await app.loadMessages();
		} catch (cause) {
			failure = errorCode(cause);
			if (failure === 'stale') {
				await app.loadMessages();
				const latest = app.messagePolicies.find((item) => item.classroom === settings.classroom);
				if (latest) {
					enabled = latest.enabled;
					limit = latest.monthlyLimit;
					revision = latest.revision;
					schedule = latest.schedule.map((day, index) => ({
						active: !!day,
						...(day ?? defaultSchedule()[index]!)
					}));
				}
			}
		} finally {
			busy = false;
		}
	}
</script>

<form class="{surface} grid gap-4" onsubmit={save}>
	<h2 class="text-2xl">{t.settings}</h2>
	<fieldset disabled={busy} class="grid gap-4">
		<label class="flex min-h-11 items-center gap-3"
			><input type="checkbox" bind:checked={enabled} />{t.enabled}</label
		>
		<label class={field.label}
			><span>{t.limit}</span><input
				class={field.input}
				type="number"
				min="0"
				max="1000"
				required
				bind:value={limit}
			/></label
		>
		<p class="text-sm text-muted">{t.quotaCopy}</p>
		<p class="font-semibold">{t.schedule}</p>
		{#each schedule as day, index}
			<div class="grid gap-2 rounded-2xl bg-white/50 p-3">
				<label class="flex min-h-11 items-center gap-3"
					><input type="checkbox" bind:checked={day.active} />{t.days[index]}</label
				>
				{#if day.active}
					<div class="grid grid-cols-2 gap-2">
						<label class={field.label}
							><span>{t.fromTime}</span><input
								aria-label={`${t.days[index]} ${t.fromTime}`}
								class={field.input}
								type="time"
								required
								bind:value={day.start}
							/></label
						>
						<label class={field.label}
							><span>{t.toTime}</span><input
								aria-label={`${t.days[index]} ${t.toTime}`}
								class={field.input}
								type="time"
								required
								min={day.start}
								bind:value={day.end}
							/></label
						>
					</div>
				{/if}
			</div>
		{/each}
		<button class={button.primary} type="submit">{t.save}</button>
	</fieldset>
	{#if failure}<p role="alert" class="text-red-700">{errorMessage(locale, failure)}</p>{/if}
	{#if saved}<p role="status">{t.saved}</p>{/if}
</form>
