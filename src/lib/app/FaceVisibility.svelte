<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { messages, type Locale } from '$lib/i18n';
	import { onMount } from 'svelte';
	import { button, modal, tag } from './ui';

	// Every child of a classroom and whether its other families see the child's face, as the review before
	// publishing an event read the consent. It opens when mounted, as ConfirmDialog does, and only shows.
	let {
		locale,
		children,
		shared,
		onclose
	}: {
		locale: Locale;
		children: { id: string; name: string }[];
		shared: Set<string>;
		onclose: () => void;
	} = $props();

	const t = $derived(messages[locale].app);
	const id = $props.id();
	let dialog = $state<HTMLDialogElement>();
	const sorted = $derived([...children].sort((a, b) => a.name.localeCompare(b.name, locale)));
	onMount(() => dialog?.showModal());
</script>

<dialog
	bind:this={dialog}
	class="{modal} p-7"
	aria-labelledby="{id}-title"
	aria-describedby="{id}-hint"
	{onclose}
>
	<h2 id="{id}-title" class="text-3xl">{t.events.faceVisibility}</h2>
	<p id="{id}-hint" class="mt-3 text-sm text-muted">{t.events.faceVisibilityHint}</p>
	<ul class="mt-5 grid max-h-[50vh] gap-3 overflow-y-auto">
		{#each sorted as child (child.id)}
			{@const visible = shared.has(child.id)}
			<li class="flex items-center justify-between gap-3">
				<span class="min-w-0 font-semibold">{child.name}</span>
				<span class={visible ? tag.good : tag.plain}>
					<Icon name={visible ? 'eye' : 'lock'} class="size-3.5" />
					{visible ? t.classroom.faceShown : t.classroom.faceCovered}
				</span>
			</li>
		{/each}
	</ul>
	<div class="mt-7 flex justify-end">
		<button class={button.secondary} type="button" onclick={() => dialog?.close()}>
			{t.actions.done}
		</button>
	</div>
</dialog>
