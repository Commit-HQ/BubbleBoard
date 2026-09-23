<script lang="ts">
	import { beforeNavigate, goto } from '$app/navigation';
	import type { Locale } from '$lib/i18n';
	import ConfirmDialog from './ConfirmDialog.svelte';

	// Asks before leaving a page that would lose work. `ask` says whether leaving loses anything; `hold` keeps
	// the page without a question while something is on its way that leaving would lose. Closing the tab or
	// leaving the site gets the browser's own question instead. Once the work is saved, `release()` lets the
	// page go. It stays mounted for as long as the page it guards.
	let {
		locale,
		title,
		copy,
		leave,
		stay,
		ask,
		hold = () => false
	}: {
		locale: Locale;
		title: string;
		copy: string;
		leave: string;
		stay: string;
		ask: () => boolean;
		hold?: () => boolean;
	} = $props();

	/** Where someone was going when asked whether to leave. */
	let leaving = $state<URL>();
	let released = false;

	beforeNavigate((navigation) => {
		if (released) return;
		if (hold()) return navigation.cancel();
		if (!ask()) return;
		navigation.cancel();
		if (!navigation.willUnload && navigation.to) leaving = navigation.to.url;
	});

	/** Lets the page go without asking, once what it held is saved. */
	export function release() {
		released = true;
	}

	async function go() {
		if (!leaving) return;
		released = true;
		try {
			await goto(leaving);
		} finally {
			released = false;
		}
	}
</script>

{#if leaving}
	<ConfirmDialog
		{locale}
		{title}
		{copy}
		confirmLabel={leave}
		cancelLabel={stay}
		safe
		onconfirm={go}
		onclose={() => (leaving = undefined)}
	/>
{/if}
