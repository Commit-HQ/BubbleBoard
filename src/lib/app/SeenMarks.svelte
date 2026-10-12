<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import type { OpenEvent } from '$lib/events/types';
	import { errorMessage, messages, type Locale } from '$lib/i18n';
	import type { Notice } from '$lib/notices';
	import HideButton from './HideButton.svelte';
	import { getApp, Task } from './state.svelte';
	import { alert, button, disclosure } from './ui';

	// The seen marks of a notice or event, at the foot of its card. A family marks it as seen with a tap, and
	// may hide it once it has; staff see which of its families did. Nothing records who opened what.
	let {
		locale,
		post,
		onmark,
		class: className = ''
	}: {
		locale: Locale;
		post: Notice | OpenEvent;
		onmark: () => Promise<unknown>;
		class?: string;
	} = $props();
	const app = getApp();
	const t = $derived(messages[locale].app.notices);
	const task = new Task();
	const unseen = $derived(app.status === 'family' && !app.isSeen(post));
	/** On a staff device, the families it is for, and those of them that marked it as seen. */
	const families = $derived(app.status === 'staff' ? app.audience(post) : []);
	const marked = $derived(new Set(post.seen));
	const seen = $derived(families.filter(({ id }) => marked.has(id)));
	const notSeen = $derived(families.filter(({ id }) => !marked.has(id)));
</script>

{#if app.status === 'family'}
	<div class="grid gap-3 {className}">
		<div class="flex flex-wrap items-center justify-between gap-2">
			{#if unseen}
				<button
					class={button.primary}
					type="button"
					disabled={task.busy}
					onclick={() => task.run(onmark)}
				>
					<Icon name="check" class="size-4" />{t.markSeen}
				</button>
			{:else}
				<p class="flex min-h-11 items-center gap-2 font-semibold text-muted">
					<Icon name="check" class="size-4" />{t.seen}
				</p>
			{/if}
			{#if !unseen || app.isHidden(post)}<HideButton {locale} {post} />{/if}
		</div>
		{#if task.error}
			<p class={alert} role="alert">{errorMessage(locale, task.error)}</p>
		{/if}
	</div>
{:else if families.length}
	<details class="group border-t border-ink/10 pt-2 {className}">
		<summary class="{disclosure} text-sm">
			<Icon name="eye" class="size-4" />{t.seenBy(seen.length, families.length)}
			<Icon
				name="chevronRight"
				class="size-4 transition-transform group-open:rotate-90 motion-reduce:transition-none"
			/>
		</summary>
		<div class="grid gap-1 text-sm">
			{#if notSeen.length}<p>{t.notSeenNames(notSeen.map(({ name }) => name))}</p>{/if}
			{#if seen.length}<p class="text-muted">{t.seenNames(seen.map(({ name }) => name))}</p>{/if}
		</div>
	</details>
{/if}
