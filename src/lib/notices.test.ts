import { describe, expect, it } from 'vitest';
import type { NoticeRecord } from './api';
import { fromBase64Url, toBase64Url } from './base64url';
import { createId, UnreadableError } from './crypto';
import {
	allowedLink,
	maxNoticeBytes,
	maxOptionLength,
	maxPollOptions,
	openBoard,
	openNotice,
	readDocument,
	sealNotice,
	sealVote,
	type NoticeContent,
	type PollOption
} from './notices';

// Notices sealed as a staff device posts them, and opened the way devices get them back from the server:
// with the keys of the classrooms each viewer sees, and for a poll's answers, the keys of the families that
// gave them. Synthetic content only.

const content: NoticeContent = {
	author: 'Ana',
	paper: 'yellow',
	body: {
		type: 'doc',
		content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Picnic on Friday' }] }]
	}
};

/** A Group Key or a Family Key, as a device holds one once it has opened it. */
function openedKey() {
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
		seen: [],
		votes: [],
		classrooms: sealed.classrooms.filter(({ classroom }) => !visible || visible.includes(classroom))
	};
}

describe('notices', () => {
	it('open with the Group Key of any of their classrooms, which are all the device names', async () => {
		const [bubbles, owls, ladybirds] = [createId(), createId(), createId()];
		const keys = new Map([
			[bubbles, await openedKey()],
			[owls, await openedKey()],
			[ladybirds, await openedKey()]
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
		const classroom = { id: createId(), groupKey: await openedKey() };
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
		const classroom = { id: createId(), groupKey: await openedKey() };
		const text = 'Bring a hat. '.repeat(maxNoticeBytes / 12);
		const long = {
			...content,
			body: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] }
		} satisfies NoticeContent;
		await expect(sealNotice(createId(), long, [classroom])).rejects.toMatchObject({
			code: 'notice-too-long'
		});
	});
});

describe('polls', () => {
	const option = (text = 'Yes'): PollOption => ({ id: createId(), text });
	const poll = { options: [option('Tuesday at 5'), option('Wednesday at 5')] };
	const [tuesday, wednesday] = poll.options.map(({ id }) => id);

	it('open each answer with its family’s key, only for its own notice and an option the poll has', async () => {
		const classroom = { id: createId(), groupKey: await openedKey() };
		const groupKeys = new Map([[classroom.id, classroom.groupKey]]);
		const id = createId();
		const record = served(id, await sealNotice(id, { ...content, poll }, [classroom]));
		const [ana, ivo, eva, maja, luka] = [
			createId(),
			createId(),
			createId(),
			createId(),
			createId()
		];
		const familyKeys = new Map<string, CryptoKey>();
		for (const family of [ana, ivo, eva, maja]) familyKeys.set(family, await openedKey());
		const staffKeys = async (family: string) => familyKeys.get(family);
		const answer = async (family: string, chosen: string, { notice = id, key = family } = {}) => ({
			family,
			choice: await sealVote(notice, chosen, poll, familyKeys.get(key) ?? (await openedKey()))
		});
		record.votes = [
			await answer(ana, wednesday),
			// Written with another family's key, for another notice, for an option the poll doesn't have, and
			// by a family whose key isn't on this device.
			await answer(ivo, tuesday, { key: eva }),
			await answer(eva, tuesday, { notice: createId() }),
			await answer(maja, createId()),
			await answer(luka, tuesday)
		];

		expect(await openNotice(record, groupKeys, staffKeys)).toMatchObject({
			poll,
			votes: [{ family: ana, option: wednesday }]
		});
		const onlyAna = async (family: string) => (family === ana ? familyKeys.get(ana) : undefined);
		const { notices } = await openBoard([record], groupKeys, onlyAna);
		expect(notices[0].votes).toEqual([{ family: ana, option: wednesday }]);

		// The same notice without its poll has no answers to show.
		const changed = served(id, await sealNotice(id, content, [classroom]));
		const opened = await openNotice({ ...changed, votes: record.votes }, groupKeys, staffKeys);
		expect(opened.votes).toEqual([]);
	});

	it('open every answer with the poll’s key when families see its counts, on any device that opens the notice', async () => {
		const classroom = { id: createId(), groupKey: await openedKey() };
		const groupKeys = new Map([[classroom.id, classroom.groupKey]]);
		const id = createId();
		const counted = { ...poll, key: toBase64Url(crypto.getRandomValues(new Uint8Array(32))) };
		const record = served(id, await sealNotice(id, { ...content, poll: counted }, [classroom]));
		const [ana, ivo, eva] = [createId(), createId(), createId()];
		record.votes = [
			{ family: ana, choice: await sealVote(id, wednesday, counted, await openedKey()) },
			{ family: ivo, choice: await sealVote(id, tuesday, counted, await openedKey()) },
			// Written with the family's own key, and for another notice.
			{ family: eva, choice: await sealVote(id, tuesday, poll, await openedKey()) },
			{ family: eva, choice: await sealVote(createId(), tuesday, counted, await openedKey()) }
		];

		// A device without any Family Key, such as another family's, counts them.
		const opened = await openNotice(record, groupKeys);
		expect(opened.poll).toEqual(counted);
		expect(opened.votes).toEqual([
			{ family: ana, option: wednesday },
			{ family: ivo, option: tuesday }
		]);

		// A key that isn't one leaves the notice unreadable.
		const broken = { ...poll, key: 'not a key' };
		const unreadable = served(id, await sealNotice(id, { ...content, poll: broken }, [classroom]));
		await expect(openNotice(unreadable, groupKeys)).rejects.toThrow(UnreadableError);
	});

	it('refuse a poll without two to ten answers, each with its own ID and a few words', async () => {
		const classroom = { id: createId(), groupKey: await openedKey() };
		const groupKeys = new Map([[classroom.id, classroom.groupKey]]);
		const open = async (options: PollOption[]) => {
			const id = createId();
			const sealed = await sealNotice(id, { ...content, poll: { options } }, [classroom]);
			return openNotice(served(id, sealed), groupKeys);
		};
		const repeated = option();
		for (const options of [
			[option()],
			Array.from({ length: maxPollOptions + 1 }, () => option()),
			[repeated, repeated],
			[option(), option('  ')],
			[option(), option('x'.repeat(maxOptionLength + 1))],
			[option(), { id: 'not an ID', text: 'No' }]
		]) {
			await expect(open(options), JSON.stringify(options)).rejects.toThrow(UnreadableError);
		}
		const most = Array.from({ length: maxPollOptions }, () => option());
		expect((await open(most)).poll).toEqual({ options: most });
	});
});

describe('notice text', () => {
	const doc = (...content: unknown[]) => ({ type: 'doc', content });
	const paragraph = (...content: unknown[]) => ({ type: 'paragraph', content });
	const text = (value: string, ...marks: unknown[]) =>
		marks.length ? { type: 'text', text: value, marks } : { type: 'text', text: value };
	const item = (...content: unknown[]) => ({ type: 'listItem', content });
	const hat = (...marks: unknown[]) => item(paragraph(text('Hat', ...marks)));
	const water = item(paragraph(text('Water')));

	it('keeps lists and links, and drops attributes the app doesn’t use and the text colours and italics notices had', () => {
		const written = doc(
			paragraph(
				text('Picnic', { type: 'bold' }, { type: 'italic' }),
				{ type: 'hardBreak' },
				text('map', {
					type: 'link',
					attrs: { href: 'https://example.com/map', target: '_blank', class: 'x' }
				})
			),
			{ type: 'bulletList', content: [hat({ type: 'colour', attrs: { colour: 'blue' } })] },
			{ type: 'orderedList', attrs: { start: 3, type: null }, content: [water] },
			{ type: 'paragraph' }
		);
		expect(readDocument(written)).toEqual(
			doc(
				paragraph(
					text('Picnic', { type: 'bold' }),
					{ type: 'hardBreak' },
					text('map', { type: 'link', attrs: { href: 'https://example.com/map' } })
				),
				{ type: 'bulletList', content: [hat()] },
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
