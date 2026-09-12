import { render } from 'svelte/server';
import { expect, it } from 'vitest';
import { readDocument } from '$lib/notices';
import NoticeBody from './NoticeBody.svelte';

// A notice's text comes from anyone who holds a classroom's key, so boards render it as text in the app's
// own elements (product-spec.md §36): markup in it stays text, and links can't break out of their tag.

it('renders a notice as text in the app’s own elements, never as markup', () => {
	const document = readDocument({
		type: 'doc',
		content: [
			{
				type: 'paragraph',
				content: [
					{ type: 'text', text: '<img src=x onerror=alert(1)>', marks: [{ type: 'bold' }] },
					{
						type: 'text',
						text: 'map',
						marks: [{ type: 'link', attrs: { href: 'https://example.com/"onmouseover="alert(1)' } }]
					}
				]
			},
			{
				type: 'bulletList',
				content: [
					{
						type: 'listItem',
						content: [
							{
								type: 'paragraph',
								content: [
									{
										type: 'text',
										text: 'Hat',
										marks: [{ type: 'colour', attrs: { colour: 'blue' } }]
									}
								]
							}
						]
					}
				]
			}
		]
	});
	// Without the comments Svelte adds to find its place when the page starts in the browser.
	const body = render(NoticeBody, { props: { blocks: document.content } }).body.replaceAll(
		/<!--.*?-->/g,
		''
	);
	expect(body).not.toContain('<img');
	expect(body).toContain('&lt;img src=x onerror=alert(1)>');
	expect(body).toContain('href="https://example.com/&quot;onmouseover=&quot;alert(1)"');
	expect(body).toContain('rel="noopener noreferrer"');
	expect(body).toMatch(
		/<ul[^>]*>.*<li[^>]*>.*<span class="text-blue-700">Hat<\/span>.*<\/li>.*<\/ul>/s
	);
});
