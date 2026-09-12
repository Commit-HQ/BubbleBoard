import { describe, expect, it } from 'vitest';
import type { NoticeRecord } from './api';
import { fromBase64Url, toBase64Url } from './base64url';
import { createId, UnreadableError } from './crypto';
import {
	allowedLink,
	maxNoticeBytes,
	NoticeTooLongError,
	openBoard,
	openNotice,
	readDocument,
	sealNotice,
	type NoticeContent
} from './notices';

// Notices sealed as a staff device posts them, and opened the way devices get them back from the server:
// with the keys of the classrooms each viewer sees. Synthetic content only.

const content: NoticeContent = {
	author: 'Ana',
	paper: 'yellow',
	body: {
		type: 'doc',
		content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Picnic on Friday' }] }]
	}
};

/** A Group Key, as a device holds one once it has opened it. */
function groupKey() {
	return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

type Sealed = Awaited<ReturnType<typeof sealNotice>>;

/** A notice as the server sends it, with only the keys of the classrooms `visible` names. */
function served(id: string, sealed: Sealed, visible?: string[]): NoticeRecord {
	return {
		id,
		teacher: createId(),
		content: sealed.content,
		postedAt: 1,
		announcedAt: 1,
		editedAt: null,
		expiresAt: 2,
		classrooms: sealed.classrooms.filter(({ classroom }) => !visible || visible.includes(classroom))
	};
}

describe('notices', () => {
	it('open with the Group Key of any of their classrooms, which are all the device names', async () => {
		const [bubbles, owls, ladybirds] = [createId(), createId(), createId()];
		const keys = new Map([
			[bubbles, await groupKey()],
			[owls, await groupKey()],
			[ladybirds, await groupKey()]
		]);
		const id = createId();
		const classrooms = [bubbles, owls].map((classroom) => ({
			id: classroom,
			groupKey: keys.get(classroom)!
		}));
		const sealed = await sealNotice(id, content, classrooms);

		// A family with children in both classrooms sees the notice once; one in Owls sees only Owls.
		expect(await openNotice(served(id, sealed), keys)).toMatchObject({
			...content,
			classrooms: [bubbles, owls]
		});
		const owlsOnly = new Map([[owls, keys.get(owls)!]]);
		const opened = await openNotice(served(id, sealed, [owls]), owlsOnly);
		expect(opened).toMatchObject({ body: content.body, classrooms: [owls] });

		// Another classroom's key opens nothing, and keys moved to another notice or classroom don't open.
		const ladybirdsOnly = new Map([[ladybirds, keys.get(ladybirds)!]]);
		await expect(openNotice(served(id, sealed), ladybirdsOnly)).rejects.toThrow(UnreadableError);
		await expect(openNotice({ ...served(id, sealed), id: createId() }, keys)).rejects.toThrow(
			UnreadableError
		);
		const moved = [{ ...sealed.classrooms[0], classroom: owls }];
		await expect(openNotice({ ...served(id, sealed), classrooms: moved }, keys)).rejects.toThrow(
			UnreadableError
		);
	});

	it('leave a notice that doesn’t open off the board, and keep the rest', async () => {
		const classroom = { id: createId(), groupKey: await groupKey() };
		const keys = new Map([[classroom.id, classroom.groupKey]]);
		const [kept, broken] = [createId(), createId()];
		const good = served(kept, await sealNotice(kept, content, [classroom]));
		const bad = served(broken, await sealNotice(broken, content, [classroom]));
		const parts = bad.content.split('.');
		const bytes = fromBase64Url(parts[2])!;
		bytes[0] ^= 1;
		parts[2] = toBase64Url(bytes);

		const board = await openBoard([{ ...bad, content: parts.join('.') }, good], keys);
		expect(board.notices.map(({ id }) => id)).toEqual([kept]);
		expect(board.unreadable).toBe(1);
	});

	it('refuse to seal more than the server stores', async () => {
		const classroom = { id: createId(), groupKey: await groupKey() };
		const text = 'Bring a hat. '.repeat(maxNoticeBytes / 12);
		const long = {
			...content,
			body: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] }
		} satisfies NoticeContent;
		await expect(sealNotice(createId(), long, [classroom])).rejects.toThrow(NoticeTooLongError);
	});
});

describe('notice text', () => {
	const doc = (...content: unknown[]) => ({ type: 'doc', content });
	const paragraph = (...content: unknown[]) => ({ type: 'paragraph', content });
	const text = (value: string, ...marks: unknown[]) =>
		marks.length ? { type: 'text', text: value, marks } : { type: 'text', text: value };
	const item = (...content: unknown[]) => ({ type: 'listItem', content });
	const hat = item(paragraph(text('Hat', { type: 'colour', attrs: { colour: 'blue' } })));
	const water = item(paragraph(text('Water')));

	it('keeps lists, links, and palette colours, and drops attributes the app doesn’t use', () => {
		const written = doc(
			paragraph(
				text('Picnic', { type: 'bold' }, { type: 'italic' }),
				{ type: 'hardBreak' },
				text('map', {
					type: 'link',
					attrs: { href: 'https://example.com/map', target: '_blank', class: 'x' }
				})
			),
			{ type: 'bulletList', content: [hat] },
			{ type: 'orderedList', attrs: { start: 3, type: null }, content: [water] },
			{ type: 'paragraph' }
		);
		expect(readDocument(written)).toEqual(
			doc(
				paragraph(
					text('Picnic', { type: 'bold' }, { type: 'italic' }),
					{ type: 'hardBreak' },
					text('map', { type: 'link', attrs: { href: 'https://example.com/map' } })
				),
				{ type: 'bulletList', content: [hat] },
				{ type: 'orderedList', attrs: { start: 3 }, content: [water] },
				{ type: 'paragraph' }
			)
		);
	});

	it('refuses anything else a key holder could write', () => {
		const nested = (depth: number): unknown =>
			depth ? { type: 'bulletList', content: [item(nested(depth - 1))] } : paragraph(text('Deep'));
		for (const written of [
			{ type: 'html', content: [] },
			doc({ type: 'image', attrs: { src: 'https://example.com/photo.png' } }),
			doc(paragraph(text('x', { type: 'link', attrs: { href: 'javascript:alert(1)' } }))),
			doc(paragraph(text('x', { type: 'link', attrs: { href: 'http://example.com' } }))),
			doc(paragraph(text('x', { type: 'colour', attrs: { colour: '#ff0000' } }))),
			doc(paragraph(text('x', { type: 'textStyle', attrs: { color: 'red' } }))),
			doc(paragraph({ type: 'text', text: '' })),
			doc({ type: 'bulletList', content: [] }),
			doc(nested(5))
		]) {
			expect(() => readDocument(written), JSON.stringify(written)).toThrow(UnreadableError);
		}
		expect(readDocument(doc(nested(4)))).toEqual(doc(nested(4)));
	});

	it('links only to web pages over https and to email addresses', () => {
		expect(allowedLink('https://vrtic.example.com/jelovnik')).toBe(true);
		expect(allowedLink('mailto:ana@example.com')).toBe(true);
		for (const refused of [
			'http://example.com',
			'javascript:alert(1)',
			'data:text/html,x',
			'ftp://x',
			'example.com'
		]) {
			expect(allowedLink(refused), refused).toBe(false);
		}
	});
});
