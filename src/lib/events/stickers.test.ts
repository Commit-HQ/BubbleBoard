import { describe, expect, it } from 'vitest';
import { freshStickers, stickers, type Sticker } from './stickers';

describe('stickers for new covers', () => {
	const all = Object.keys(stickers) as Sticker[];
	it('never repeats one while another is unworn', () => {
		const picked = freshStickers(['fox', undefined], all.length - 2);
		expect(new Set([...picked, 'fox', 'smile']).size).toBe(all.length);
	});
	it('reuses the least worn once every sticker is on the photo', () => {
		const picked = freshStickers([...all, ...all.filter((s) => s !== 'moon')], 1);
		expect(picked).toEqual(['moon']);
	});
	it('picks at random', () => {
		expect(freshStickers([], 1, () => 0)).not.toEqual(freshStickers([], 1, () => 0.99));
	});
});
