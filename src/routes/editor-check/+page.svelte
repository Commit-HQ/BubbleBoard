<script lang="ts">
	import { checkEventPixels } from '$lib/events/browser-check';
	let result = $state('');
	import EventPhotoEditor from '$lib/app/EventPhotoEditor.svelte';
	import { setApp, type App } from '$lib/app/state.svelte';
	import { messages } from '$lib/i18n';
	import { tick } from 'svelte';
	import sample from '$lib/assets/photos/classroom-800.webp';
	const classrooms = [{ id: 'demo', name: 'Bubbles' }];
	const children = ['Ana', 'Luka', 'Petra', 'Marko', 'Mia', 'Ivan', 'Ema', 'Niko'].map(
		(name, i) => ({ id: String(i), name, classroom: 'demo', families: [] })
	);
	setApp({ myClassrooms: classrooms, catalog: { children } } as unknown as App);
	async function addSample() {
		const blob = await (await fetch(sample)).blob();
		// The editor opens on the event's details; its photos are the next step.
		if (!document.querySelector('input[type=file]')) {
			const label = messages.en.app.eventEditor.continue;
			[...document.querySelectorAll('button')]
				.find((button) => button.textContent?.trim().startsWith(label))
				?.click();
			await tick();
		}
		const input = document.querySelector('input[type=file]') as HTMLInputElement;
		const transfer = new DataTransfer();
		transfer.items.add(new File([blob], 'stock.webp', { type: blob.type }));
		input.files = transfer.files;
		input.dispatchEvent(new Event('change', { bubbles: true }));
	}
</script>

<main class="mx-auto max-w-6xl p-6">
	<button
		onclick={async () => {
			result = 'Running…';
			try {
				result = await checkEventPixels();
			} catch (error) {
				result = String(error);
			}
		}}>Test: encrypted pixels</button
	>
	<p role="status">{result}</p>
	<button onclick={addSample}>Test: load stock photo</button><EventPhotoEditor locale="en" />
</main>
