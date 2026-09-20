<script lang="ts">
	import { messages, type Locale } from '$lib/i18n';
	import DaysChoice from './DaysChoice.svelte';
	import { field, surface } from './ui';

	// The first step of an event: which classroom it belongs to, what it's called, when it happened, and how
	// long the gallery stays up — the same questions, asked the same way, as a notice's form. The photos come
	// next, so the classroom settles here: it decides whose children can be named, and it can't change once
	// photos are labelled.
	let {
		locale,
		classrooms,
		publishable,
		locked,
		classroom = $bindable(),
		title = $bindable(),
		date = $bindable(),
		description = $bindable(),
		days = $bindable()
	}: {
		locale: Locale;
		classrooms: { id: string; name: string }[];
		/** Whether this device can publish at all; the development fixture only prepares photos. */
		publishable: boolean;
		/** Whether photos are labelled already, which ties the event to its classroom. */
		locked: boolean;
		classroom: string;
		title: string;
		date: string;
		description: string;
		days: number;
	} = $props();

	const t = $derived(messages[locale].app.eventEditor);
	const e = $derived(messages[locale].app.events);
</script>

<div class="{surface} grid gap-7">
	{#if classrooms.length > 1}
		<div class="grid gap-1.5">
			<label class={field.label}>
				<span class={field.name}>{t.classroom}</span>
				<select class={field.input} bind:value={classroom} disabled={locked}>
					<option value="" disabled>{t.classroom}</option>
					{#each classrooms as option (option.id)}<option value={option.id}>{option.name}</option
						>{/each}
				</select>
			</label>
			{#if locked}<p class={field.hint}>{t.classroomLocked}</p>{/if}
		</div>
	{:else}
		<!-- With a single classroom there's nothing to choose, so the event simply says whose it is. -->
		<p class="grid gap-1.5">
			<span class={field.name}>{t.classroom}</span>
			<span class="text-lg">{classrooms[0]?.name ?? ''}</span>
		</p>
	{/if}

	{#if publishable}
		<label class={field.label}>
			<span class={field.name}>{e.name}</span>
			<input class={field.input} maxlength="160" bind:value={title} required />
		</label>

		<label class={field.label}>
			<span class={field.name}>{e.date}</span>
			<input class={field.input} type="date" bind:value={date} required />
		</label>

		<label class={field.label}>
			<span class={field.name}>{e.description}</span>
			<textarea class={field.input} rows="4" maxlength="5000" bind:value={description}></textarea>
		</label>

		<DaysChoice {locale} legend={e.days} bind:days />
	{/if}
</div>
