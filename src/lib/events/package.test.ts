import { describe, it, expect } from 'vitest';
import {
	createContentKey,
	createId,
	encryptData,
	decryptData,
	encryptBytes,
	decryptBytes
} from '$lib/crypto';
import { sharing, facePixels, openEvent } from './package';
import { mostEventPhotos } from './types';
import type { EventRecord } from './types';

describe('event privacy', () => {
	it('requires consent from every linked family and ignores unrelated child choices', async () => {
		const a = await createContentKey(),
			b = await createContentKey();
		const row = async (child: string, family: string, key: CryptoKey, share: boolean) => ({
			child,
			family,
			label: '',
			revision: 0,
			choice: await encryptData({ share }, key, {
				purpose: 'photo-choice',
				event: child,
				part: family
			})
		});
		const children = [
			{ id: 'child', families: ['a', 'b'] },
			{ id: 'sibling', families: ['a'] },
			{ id: 'guest', families: [] }
		];
		const rows = [
			await row('child', 'a', a.key, true),
			await row('child', 'b', b.key, false),
			await row('sibling', 'a', a.key, true),
			await row('other', 'a', a.key, true)
		];
		const keys = async (f: string) => (f === 'a' ? a.key : b.key);
		expect([...(await sharing(children, rows, keys))]).toEqual(['sibling']);
		rows[1] = await row('child', 'b', b.key, true);
		expect([...(await sharing(children, rows, keys))]).toEqual(['child', 'sibling']);
		rows[1].choice = 'corrupted';
		expect([...(await sharing(children, rows, keys))]).toEqual(['sibling']);
	});
	it('removes all overlap channels before encrypting a face crop', () => {
		const source = new Uint8ClampedArray(10 * 10 * 4).fill(173);
		const pixels = facePixels(source, 10, { x: 2, y: 2, width: 4, height: 4 }, [
			{ x: 4, y: 1, width: 3, height: 5 }
		]);
		for (let y = 0; y < 4; y++)
			for (let x = 0; x < 4; x++)
				expect([...pixels.slice((y * 4 + x) * 4, (y * 4 + x) * 4 + 4)]).toEqual(
					x >= 2 ? [0, 0, 0, 0] : [173, 173, 173, 173]
				);
	});
	it('binds patches and grants to their event, photo and face, and refuses another family key', async () => {
		const family = await createContentKey(),
			other = await createContentKey(),
			face = await createContentKey();
		const event = createId(),
			photo = createId(),
			part = createId();
		const context = { purpose: 'event-grant' as const, event, photo, part };
		const grant = await encryptData({ key: face.raw }, family.key, context);
		await expect(decryptData(grant, other.key, context)).rejects.toThrow();
		for (const changed of [{ event: createId() }, { photo: createId() }, { part: createId() }])
			await expect(decryptData(grant, family.key, { ...context, ...changed })).rejects.toThrow();
		const encrypted = await encryptBytes(new Uint8Array([1, 2, 3]), face.key, {
			...context,
			purpose: 'event-face'
		});
		await expect(
			decryptBytes(encrypted, other.key, { ...context, purpose: 'event-face' })
		).rejects.toThrow();
		expect([
			...(await decryptBytes(encrypted, face.key, { ...context, purpose: 'event-face' }))
		]).toEqual([1, 2, 3]);
	});
	describe('reading an event', () => {
		/** An event sealed as a device publishes it, to be opened again with the classroom's key. */
		async function sealed(value: unknown) {
			const group = await createContentKey(),
				content = await createContentKey();
			const id = createId();
			const record: EventRecord = {
				id,
				classroom: createId(),
				teacher: null,
				postedAt: 0,
				editedAt: null,
				expiresAt: 0,
				eventKey: await encryptData({ key: content.raw }, group.key, {
					purpose: 'event-key',
					event: id
				}),
				content: await encryptData(value, content.key, { purpose: 'event-content', event: id })
			};
			return openEvent(record, group.key);
		}
		const base = {
			version: 1,
			title: 'Autumn walk',
			date: '2026-09-20',
			photos: [{ id: createId(), width: 800, height: 600 }]
		};

		it('reads formatted words and a photo’s own words, and leaves out empty ones', async () => {
			const words = {
				type: 'doc',
				content: [{ type: 'paragraph', content: [{ type: 'text', text: 'We walked.' }] }]
			};
			const photos = [
				{ ...base.photos[0], text: 'Ana found a chestnut.' },
				{ id: createId(), width: 10, height: 10, text: '' }
			];
			const { value } = await sealed({ ...base, description: words, photos });
			expect(value.description).toEqual(words);
			expect(value.photos.map((photo) => photo.text)).toEqual(['Ana found a chestnut.', undefined]);
		});

		it('names whoever published it, and opens an event published without a name', async () => {
			const words = { type: 'doc', content: [] };
			const named = await sealed({ ...base, description: words, author: 'Teta Ana' });
			expect(named.value.author).toBe('Teta Ana');
			const unnamed = await sealed({ ...base, description: words });
			expect(unnamed.value.author).toBeUndefined();
			for (const author of ['', 7, 'x'.repeat(161)])
				await expect(sealed({ ...base, description: words, author })).rejects.toThrow();
		});

		it('refuses a gallery larger than any installation may publish', async () => {
			const many = (count: number) =>
				Array.from({ length: count }, () => ({ id: createId(), width: 10, height: 10 }));
			const words = { type: 'doc', content: [] };
			const { value } = await sealed({
				...base,
				description: words,
				photos: many(mostEventPhotos)
			});
			expect(value.photos).toHaveLength(mostEventPhotos);
			await expect(
				sealed({ ...base, description: words, photos: many(mostEventPhotos + 1) })
			).rejects.toThrow();
		});

		it('refuses words it can’t show and a photo’s words beyond the limit', async () => {
			await expect(
				sealed({ ...base, description: { type: 'doc', content: [{ type: 'heading' }] } })
			).rejects.toThrow();
			await expect(
				sealed({
					...base,
					description: { type: 'doc', content: [] },
					photos: [{ ...base.photos[0], text: 'x'.repeat(301) }]
				})
			).rejects.toThrow();
		});
	});
});
