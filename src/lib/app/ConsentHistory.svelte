<script lang="ts">
	import { errorMessage, formatDateTime, messages, type Locale } from '$lib/i18n';
	import { onMount } from 'svelte';
	import { getApp, Task } from './state.svelte';
	import { alert, button, modal } from './ui';

	// When a child's face was allowed to be seen by the classroom's families and when it was covered again,
	// and who changed it. It opens when mounted, as ConfirmDialog does, and `onclose` runs when it closes. A
	// family sees its own changes and staff's; staff see every family card's, named.
	let { locale, child, onclose }: { locale: Locale; child: string; onclose: () => void } = $props();

	const app = getApp(),
		task = new Task();
	const t = $derived(messages[locale].app.history);
	const id = $props.id();
	let dialog = $state<HTMLDialogElement>();
	let rows = $state<Awaited<ReturnType<typeof app.photoHistory>>>();

	onMount(() => {
		dialog?.showModal();
		void task.run(async () => {
			rows = await app.photoHistory(child);
		});
	});

	function who(row: { family: string; teacher: string | null; childAdded: boolean }) {
		if (app.messageFamily) {
			if (!row.teacher) return t.byOwnFamily;
			return row.childAdded ? t.onAddingOwnChild : t.byKindergarten;
		}
		if (!row.teacher) {
			const card = app.catalog.families.find((family) => family.id === row.family);
			return card ? t.byFamily(card.name) : t.byParents;
		}
		const teacher = app.catalog.teachers.find((candidate) => candidate.id === row.teacher);
		if (row.childAdded) return teacher ? t.onAddingChildBy(teacher.name) : t.onAddingChild;
		return teacher ? t.byTeacher(teacher.name) : t.byStaff;
	}
</script>

<dialog
	bind:this={dialog}
	class="{modal} p-7"
	aria-labelledby="{id}-title"
	aria-describedby="{id}-hint"
	{onclose}
>
	<h2 id="{id}-title" class="text-3xl">{t.title}</h2>
	<p id="{id}-hint" class="mt-3 text-sm text-muted">{t.hint}</p>
	{#if task.error}
		<p class="{alert} mt-4" role="alert">{errorMessage(locale, task.error)}</p>
	{:else if rows}
		<ol class="mt-5 grid max-h-[50vh] gap-4 overflow-y-auto">
			{#each rows as row, index (index)}
				<li>
					<p class="font-semibold">{row.share ? t.shown : t.covered}</p>
					<p class="text-sm text-muted">{formatDateTime(locale, row.at)} · {who(row)}</p>
				</li>
			{:else}
				<li class="text-muted">{t.empty}</li>
			{/each}
		</ol>
	{/if}
	<div class="mt-7 flex justify-end">
		<button class={button.secondary} type="button" onclick={() => dialog?.close()}>
			{messages[locale].app.actions.done}
		</button>
	</div>
</dialog>
