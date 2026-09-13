<script lang="ts">
	import type { NoticeBlock, NoticeInline, NoticeListItem, NoticeMark } from '$lib/notices';
	import { noticeText, textColourClass } from './ui';

	// A notice's text, rendered from its checked document (src/lib/notices.ts) with the app's own elements,
	// never as HTML (product-spec.md §36), and looking as it did in the editor. Links open outside the app.
	let { blocks }: { blocks: NoticeBlock[] } = $props();
</script>

{#snippet marked(text: string, marks: NoticeMark[])}
	{#if !marks.length}
		{text}
	{:else}
		{@const [mark, ...rest] = marks}
		{#if mark.type === 'bold'}
			<strong>{@render marked(text, rest)}</strong>
		{:else if mark.type === 'italic'}
			<em>{@render marked(text, rest)}</em>
		{:else if mark.type === 'colour'}
			<span class={textColourClass[mark.attrs.colour]}>{@render marked(text, rest)}</span>
		{:else}
			<a href={mark.attrs.href} target="_blank" rel="noopener noreferrer"
				>{@render marked(text, rest)}</a
			>
		{/if}
	{/if}
{/snippet}

{#snippet inline(nodes: NoticeInline[])}
	{#each nodes as node, index (index)}{#if node.type === 'hardBreak'}<br />{:else}{@render marked(
				node.text,
				node.marks ?? []
			)}{/if}{/each}
{/snippet}

{#snippet items(list: NoticeListItem[])}
	{#each list as item, index (index)}
		<li>
			{#each item.content as child, childIndex (childIndex)}{@render block(child)}{/each}
		</li>
	{/each}
{/snippet}

{#snippet block(node: NoticeBlock)}
	{#if node.type === 'paragraph'}
		<!-- An empty paragraph is a blank line. -->
		<p>
			{#if node.content?.length}{@render inline(node.content)}{:else}<br />{/if}
		</p>
	{:else if node.type === 'bulletList'}
		<ul>{@render items(node.content)}</ul>
	{:else}
		<ol start={node.attrs.start}>
			{@render items(node.content)}
		</ol>
	{/if}
{/snippet}

<div class={noticeText}>
	{#each blocks as node, index (index)}{@render block(node)}{/each}
</div>
