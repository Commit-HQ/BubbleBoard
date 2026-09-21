<script lang="ts">
	import { messages, type Locale } from '$lib/i18n';
	import type { NoticeDocument } from '$lib/notices';
	import DaysChoice from './DaysChoice.svelte';
	import NoticeEditor from './NoticeEditor.svelte';
	import { field, surface } from './ui';

	// The first step of an event: which classroom it belongs to, what it's called, when it happened, what it
	// was, and how long the gallery stays up — the same questions, fields and words as a notice's form, its
	// text editor included. The photos come next, so the classroom settles here: it decides whose children can
	// be named, and it can't change once photos are labelled.
	let {
		locale,
		classrooms,
		locked,
		description,
		classroom = $bindable(),
		title = $bindable(),
		date = $bindable(),
		days = $bindable(),
		ready = $bindable(false)
	}: {
		locale: Locale;
		classrooms: { id: string; name: string }[];
		/** Whether photos are labelled already, which ties the event to its classroom. */
		locked: boolean;
		/** The words written so far, which come back when the teacher returns to this step. */
		description: NoticeDocument;
		classroom: string;
		title: string;
		date: string;
		days: number;
		/** Whether the text editor has loaded, so its words can be read. */
		ready?: boolean;
	} = $props();

	const t = $derived(messages[locale].app.eventEditor);
	const e = $derived(messages[locale].app.events);
	const id = $props.id();
	let editor = $state<ReturnType<typeof NoticeEditor>>();

	/** What was written, or undefined when it holds more than a gallery shows. An event may say nothing. */
	export function text(): NoticeDocument | undefined {
		if (!editor || editor.isEmpty()) return { type: 'doc', content: [] };
		return editor.getDocument();
	}
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

	<label class={field.label}>
		<span class={field.name}>{e.name}</span>
		<input class={field.input} maxlength="160" bind:value={title} required />
	</label>

	<label class={field.label}>
		<span class={field.name}>{e.date}</span>
		<input class={field.input} type="date" bind:value={date} required />
	</label>

	<div class="grid gap-1.5">
		<span id="{id}-description" class={field.name}>{e.description}</span>
		<NoticeEditor
			bind:this={editor}
			bind:ready
			{locale}
			content={description}
			labelledby="{id}-description"
		/>
	</div>

	<DaysChoice {locale} legend={e.days} bind:days />
</div>
