<script lang="ts">
	import type { Region } from '$lib/events/editor';
	import { stickers, type Sticker } from '$lib/events/stickers';
	import { messages, type Locale } from '$lib/i18n';
	import { button } from './ui';

	// The sticker the selected cover wears, in the editor's toolbar beside + Cover. The eighteen stickers fill a
	// phone's screen, so they wait behind this one button, on a row of their own under the toolbar's buttons.
	let {
		locale,
		cover,
		onsticker
	}: {
		locale: Locale;
		/** The selected cover; nothing, or an invisible cover, leaves the button unusable. */
		cover?: Region;
		onsticker: (sticker: Sticker) => void;
	} = $props();

	const t = $derived(messages[locale].app.eventEditor);
	const id = $props.id();
	let picking = $state(false);
	const usable = $derived(!!cover && !cover.invisible);
	// Another cover, or none, puts the stickers away; moving the same cover leaves them open.
	const showing = $derived(usable ? cover!.id : '');
	$effect(() => {
		void showing;
		picking = false;
	});
</script>

<button
	type="button"
	class="{button.secondary} px-3 disabled:opacity-40"
	aria-label={t.sticker}
	title={t.sticker}
	aria-expanded={picking}
	aria-controls="{id}-stickers"
	disabled={!usable}
	onclick={() => (picking = !picking)}
>
	<img src={stickers[cover?.sticker ?? 'smile']} alt="" class="size-6" />
</button>
<div
	id="{id}-stickers"
	class="order-last flex basis-full flex-wrap items-center gap-2 p-1"
	hidden={!picking || !usable}
	role="group"
	aria-label={t.sticker}
>
	{#each Object.entries(stickers) as [name, source] (name)}
		<!-- A ring marks the chosen sticker, which forced colours would otherwise flatten. -->
		<button
			type="button"
			class="grid size-11 place-items-center rounded-full ring-1 ring-ink/10 transition hover:bg-ink/5 aria-pressed:ring-3 aria-pressed:ring-accent"
			aria-label={t.stickerNames[name as Sticker]}
			title={t.stickerNames[name as Sticker]}
			aria-pressed={(cover?.sticker ?? 'smile') === name}
			onclick={() => {
				onsticker(name as Sticker);
				picking = false;
			}}
		>
			<img src={source} alt="" class="size-7" />
		</button>
	{/each}
</div>
