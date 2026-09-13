<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { onMount } from 'svelte';
	import { getApp } from './state.svelte';

	// Pulling home down from its top loads the board again, as in other apps: the installed app has no reload
	// button. Meanwhile the browser's own pull, which would reload the whole app, and the page's bounce are
	// off. An arrow under the header turns with the pull and spins while the board loads. It moves through its
	// style property, which the CSP allows, unlike style attributes, and it's only a picture of the gesture, so
	// screen readers skip it.
	const app = getApp();
	/** How far the arrow comes down, in pixels, before letting go loads the board. */
	const distance = 72;
	/** Where the finger started, while a pull is under way. */
	let start = $state<number>();
	let pulled = $state(0);
	let loading = $state(false);

	onMount(() => {
		const pages = [document.documentElement, document.body];
		pages.forEach((page) => page.classList.add('overscroll-y-none'));
		return () => pages.forEach((page) => page.classList.remove('overscroll-y-none'));
	});

	function begin(event: TouchEvent) {
		// Not with two fingers, nor in a dialog, such as a picture zoomed in on the whole screen.
		const inDialog = event.target instanceof Element && event.target.closest('dialog');
		if (loading || scrollY > 0 || event.touches.length > 1 || inDialog) return;
		start = event.touches[0].clientY;
	}

	function follow(event: TouchEvent) {
		if (start === undefined) return;
		// The arrow comes down at half the finger's speed, and only a little past where it loads the board.
		const down = scrollY > 0 ? 0 : (event.touches[0].clientY - start) / 2;
		pulled = Math.min(Math.max(down, 0), distance * 1.25);
	}

	async function release(event: TouchEvent) {
		if (start === undefined) return;
		start = undefined;
		if (event.type === 'touchend' && pulled >= distance) {
			loading = true;
			// Long enough to see, even when the board comes back straight away.
			await Promise.all([app.refresh({ now: true }), new Promise((done) => setTimeout(done, 600))]);
			loading = false;
		}
		pulled = 0;
	}
</script>

<svelte:window
	ontouchstart={begin}
	ontouchmove={follow}
	ontouchend={release}
	ontouchcancel={release}
/>

<div class="pointer-events-none fixed inset-x-0 top-20 z-20 flex justify-center" aria-hidden="true">
	<span
		class="grid size-11 place-items-center rounded-full bg-white text-ink shadow-lg ring-1 shadow-ink/10 ring-ink/10 motion-reduce:transition-none {start ===
		undefined
			? 'transition'
			: ''}"
		style:opacity={loading ? 1 : pulled / distance}
		style:transform="translateY({(loading ? distance : pulled) / 2}px) rotate({pulled * 4}deg)"
	>
		<Icon name="refresh" class="size-5 {loading ? 'animate-spin' : ''}" />
	</span>
</div>
