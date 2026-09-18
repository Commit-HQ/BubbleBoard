<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { button } from './ui';

	// The button that loads a page's list again. The icon turns while the work runs, so a tap says something
	// is happening; the label is a tooltip and the name a screen reader reads, since the icon stands alone.
	let { label, onrefresh }: { label: string; onrefresh: () => Promise<unknown> } = $props();

	/** One turn of the icon, as `animate-spin` takes. An answer that comes sooner still turns it once, rather
	 * than twitch and stop, and a turn ends where it started, so nothing jumps when it does. */
	const oneTurn = 1000;
	let busy = $state(false);

	async function refresh() {
		if (busy) return;
		busy = true;
		try {
			await Promise.all([onrefresh(), new Promise((done) => setTimeout(done, oneTurn))]);
		} finally {
			busy = false;
		}
	}
</script>

<button
	type="button"
	class="{button.icon} disabled:pointer-events-none"
	aria-label={label}
	title={label}
	disabled={busy}
	onclick={refresh}
>
	<Icon name="refresh" class="size-5 {busy ? 'animate-spin' : ''}" />
</button>
