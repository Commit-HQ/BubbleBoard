<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { errorMessage, formatDateTime, messages, type Locale } from '$lib/i18n';
	import InfoDialog from './InfoDialog.svelte';
	import { getApp, Task } from './state.svelte';
	import { alert, button } from './ui';

	// A History button, and what it opens: when a child's face was allowed to be seen by the classroom's
	// families and when it was covered again, and who changed it. A family sees its own changes and staff's;
	// staff see every family card's, named.
	let { locale, child }: { locale: Locale; child: string } = $props();

	const app = getApp(),
		task = new Task();
	const t = $derived(messages[locale].app.history);
	let open = $state(false);
	let rows = $state<Awaited<ReturnType<typeof app.photoHistory>>>();

	function show() {
		open = true;
		rows = undefined;
		void task.run(async () => {
			rows = await app.photoHistory(child);
		});
	}

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

<button class="{button.quiet} -ml-3 justify-self-start text-sm" type="button" onclick={show}>
	<Icon name="clock" class="size-4" />{t.open}
</button>
{#if open}
	<InfoDialog {locale} title={t.title} hint={t.hint} onclose={() => (open = false)}>
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
	</InfoDialog>
{/if}
