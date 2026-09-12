<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { messages, type Locale } from '$lib/i18n';
	import { onMount } from 'svelte';
	import { button } from './ui';

	// The rear camera, reading QR codes until one is a card; the camera part of the decoder loads when a
	// scan starts. A photo of the card works here too, for devices without a camera or where it isn't
	// allowed. Closing the scanner releases the camera.
	let {
		locale,
		disabled,
		onread,
		onphoto
	}: {
		locale: Locale;
		disabled: boolean;
		/** Receives each code the camera reads, and returns whether scanning is done. */
		onread: (text: string) => boolean;
		onphoto: (photo: File) => void;
	} = $props();

	const t = $derived(messages[locale].app.connect);
	let video = $state<HTMLVideoElement>();
	let camera = $state<'starting' | 'on' | 'blocked' | 'missing'>('starting');

	onMount(() => {
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
				const cancel = frameLoop(async () => {
					if (reading) return;
					reading = true;
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

	function choose(event: Event & { currentTarget: EventTarget & HTMLInputElement }) {
		const input = event.currentTarget;
		const [photo] = input.files ?? [];
		input.value = '';
		if (photo) onphoto(photo);
	}
</script>

<div class="mt-6 grid justify-items-start gap-4">
	{#if camera === 'blocked' || camera === 'missing'}
		<p class="font-semibold text-muted">{camera === 'blocked' ? t.cameraBlocked : t.noCamera}</p>
	{:else}
		<video
			bind:this={video}
			class="aspect-square w-full max-w-sm rounded-3xl bg-ink object-cover"
			muted
			playsinline
			aria-hidden="true"
		></video>
		<p class="text-muted">{camera === 'starting' ? t.cameraStarting : t.camera}</p>
	{/if}
	<label
		class="{button.secondary} cursor-pointer has-focus-visible:outline-3 has-focus-visible:outline-offset-4 has-focus-visible:outline-accent"
	>
		<Icon name="image" class="size-4" />{t.photo}
		<input class="sr-only" type="file" accept="image/*" {disabled} onchange={choose} />
	</label>
</div>
