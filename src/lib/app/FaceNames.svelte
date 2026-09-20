<script lang="ts">
	import type { Region } from '$lib/events/editor';

	// The name under each cover, written on the photo itself while a teacher marks it and while they check
	// what they are about to publish, so who is where can be read at a glance. It is drawn over the picture on
	// this device only: a name never enters a published photo (docs/events-format.md).
	let {
		regions,
		name
	}: {
		regions: Region[];
		/** What the classroom calls a child, by its ID, or nothing when the child is no longer in it. */
		name: (child: string) => string;
	} = $props();
</script>

{#each regions as region (region.id)}
	{@const written = region.child ? name(region.child) : ''}
	{#if written}
		{@const size = Math.max(10, Math.min(region.width * 0.28, region.height * 0.22))}
		{@const room = region.width * 0.94}
		<!-- The outline is painted behind the letters, so a name reads over a sticker as well as over a face,
		     and a name wider than its cover is squeezed to fit rather than reaching into the next one. -->
		<text
			class="pointer-events-none select-none"
			x={region.x + region.width / 2}
			y={region.y + region.height - size * 0.3}
			text-anchor="middle"
			font-size={size}
			font-weight="700"
			fill="#fff"
			stroke="#29253d"
			stroke-width="3"
			paint-order="stroke"
			vector-effect="non-scaling-stroke"
			textLength={written.length * size * 0.55 > room ? room : undefined}
			lengthAdjust={written.length * size * 0.55 > room ? 'spacingAndGlyphs' : undefined}
			>{written}</text
		>
	{/if}
{/each}
