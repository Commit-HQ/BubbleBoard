<script lang="ts">
	import { errorMessage, messages, type Locale } from '$lib/i18n';
	import { onMount } from 'svelte';
	import { alert, button } from './ui';

	// The rear camera in a dialog in the middle of the screen, reading QR codes until one is a card; the camera
	// part of the decoder loads when it opens. It opens when mounted, as ConfirmDialog is, and `onclose` runs
	// when it closes, by Escape or Cancel. Closing or removing it releases the camera.
	let {
		locale,
		error,
		onread,
		onclose
	}: {
		locale: Locale;
		/** Why the last code the camera read isn't a card, shown while scanning goes on. */
		error?: string;
		/** Receives each code the camera reads, and returns whether scanning is done. */
		onread: (text: string) => boolean;
		onclose: () => void;
	} = $props();

	const t = $derived(messages[locale].app);
	let dialog = $state<HTMLDialogElement>();
	let video = $state<HTMLVideoElement>();
	let camera = $state<'starting' | 'on' | 'blocked' | 'missing'>('starting');

	onMount(() => {
		dialog?.showModal();
		let stop: (() => void) | undefined;
		let closed = false;
		(async () => {
			try {
				const { QRCanvas, frameLoop, rearCamera } = await import('qr/dom.js');
				if (closed || !video) return;
				const player = video;
				const stream = await rearCamera(player);
				if (closed) {
					stream.stop();
					return;
				}
				camera = 'on';
				const canvas = new QRCanvas();
				let reading = false;
				let readAt = -Infinity;
				// Reading a frame holds up the page, so the camera is read a few times a second, not every frame.
				const cancel = frameLoop(async (time) => {
					if (reading || time - readAt < 200) return;
					reading = true;
					readAt = time;
					// A frame without a readable code is a miss; the next frame tries again.
					const text = await stream.readFrame(canvas, true).catch(() => undefined);
					reading = false;
					if (typeof text === 'string' && !closed && onread(text)) stop?.();
				}, player);
				stop = () => {
					cancel();
					stream.stop();
				};
			} catch (cause) {
				camera =
					cause instanceof DOMException && cause.name === 'NotAllowedError' ? 'blocked' : 'missing';
			}
		})();
		return () => {
			closed = true;
			stop?.();
		};
	});
</script>

<dialog
	bind:this={dialog}
	class="m-auto w-[calc(100%-2rem)] max-w-md rounded-4xl bg-white p-6 text-ink shadow-2xl shadow-indigo-950/25 backdrop:bg-ink/30 sm:p-7"
	aria-label={t.connect.scan}
	{onclose}
>
	{#if camera === 'blocked' || camera === 'missing'}
		<p class="font-semibold text-muted">
			{camera === 'blocked' ? t.connect.cameraBlocked : t.connect.noCamera}
		</p>
	{:else}
		<video
			bind:this={video}
			class="aspect-square w-full rounded-3xl bg-ink object-cover"
			muted
			playsinline
			aria-hidden="true"
		></video>
		<p class="mt-4 text-center text-muted">
			{camera === 'starting' ? t.connect.cameraStarting : t.connect.camera}
		</p>
	{/if}
	{#if error}<p class="{alert} mt-4" role="alert">{errorMessage(locale, error)}</p>{/if}
	<div class="mt-6 flex justify-end">
		<button class={button.secondary} type="button" onclick={() => dialog?.close()}>
			{t.actions.cancel}
		</button>
	</div>
</dialog>
