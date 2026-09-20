<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { unresolved, type History } from '$lib/events/editor';
	import { messages, type Locale } from '$lib/i18n';

	// Every photo of the draft in one row, with what each still needs: a tick when it's reviewed, how many
	// faces are waiting, or a dot while the faces are being looked for. Tapping one opens it, losing no work.
	type Item = { id: string; url: string; history: History; detection: string };
	let {
		locale,
		photos,
		current,
		onpick
	}: { locale: Locale; photos: Item[]; current: string; onpick: (id: string) => void } = $props();

	const t = $derived(messages[locale].app.eventEditor);

	function waiting(item: Item) {
		return item.history.present.reviewed ? 0 : unresolved(item.history.present);
	}
	function status(item: Item) {
		if (item.detection === 'pending') return t.detecting;
		if (item.history.present.reviewed) return t.reviewed;
		const left = unresolved(item.history.present);
		return left ? t.remaining(left) : t.reviewNeeded;
	}
</script>

<ul class="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 py-1" aria-label={t.photos}>
	{#each photos as item, index (item.id)}
		{@const label = `${t.photo(index + 1, photos.length)} — ${status(item)}`}
		<li class="snap-start">
			<button
				type="button"
				class="relative block size-16 overflow-hidden rounded-2xl ring-1 ring-ink/10 transition hover:ring-ink/25 aria-pressed:ring-3 aria-pressed:ring-accent"
				aria-pressed={item.id === current}
				title={label}
				onclick={() => onpick(item.id)}
			>
				<img src={item.url} alt="" class="size-full object-cover" />
				<span class="sr-only">{label}</span>
				<span
					class="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-ink/70 px-1.5 py-0.5 text-xs font-bold text-white"
					aria-hidden="true"
				>
					<span>{index + 1}</span>
					{#if item.detection === 'pending'}
						<span class="size-2 rounded-full bg-white/70"></span>
					{:else if item.history.present.reviewed}
						<Icon name="check" class="size-3.5" />
					{:else if waiting(item)}
						<span class="text-apricot">{waiting(item)}</span>
					{:else}
						<span class="size-2 rounded-full bg-apricot"></span>
					{/if}
				</span>
			</button>
		</li>
	{/each}
</ul>
