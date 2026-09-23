import smile from '$lib/assets/face-sticker.svg';
import star from '$lib/assets/face-star.svg';
import heart from '$lib/assets/face-heart.svg';
import sun from '$lib/assets/face-sun.svg';
import flower from '$lib/assets/face-flower.svg';
import cloud from '$lib/assets/face-cloud.svg';
import bubble from '$lib/assets/face-bubble.svg';
import cat from '$lib/assets/face-cat.svg';
import bear from '$lib/assets/face-bear.svg';
import bunny from '$lib/assets/face-bunny.svg';
import fox from '$lib/assets/face-fox.svg';
import frog from '$lib/assets/face-frog.svg';
import panda from '$lib/assets/face-panda.svg';
import chick from '$lib/assets/face-chick.svg';
import penguin from '$lib/assets/face-penguin.svg';
import ladybug from '$lib/assets/face-ladybug.svg';
import moon from '$lib/assets/face-moon.svg';
import strawberry from '$lib/assets/face-strawberry.svg';

// The artwork a cover wears. It is decoration only: the flat colour under it is what hides a face
// (src/lib/events/editor.ts), so a sticker may be any shape. Each fills its square to the edges, because a
// cover is rarely square and the sticker is stretched to it, and each has a size of its own, without which
// Firefox draws nothing onto the canvas a published photo is made on.
export const stickers = {
	smile,
	star,
	heart,
	sun,
	flower,
	cloud,
	bubble,
	cat,
	bear,
	bunny,
	fox,
	frog,
	panda,
	chick,
	penguin,
	ladybug,
	moon,
	strawberry
};
export type Sticker = keyof typeof stickers;
export const stickerUrl = (value?: string) => stickers[value as Sticker] ?? stickers.smile;

const names = Object.keys(stickers) as Sticker[];
/**
 * Stickers for new covers, picked at random so a photo full of children isn't a wall of one face: never one a
 * cover on the photo already wears while another is left, and the least worn once all are. The teacher may
 * still give two covers the same one.
 */
export function freshStickers(worn: (Sticker | undefined)[], count: number, random = Math.random) {
	const uses = new Map(names.map((name) => [name, 0]));
	for (const sticker of worn) uses.set(sticker ?? 'smile', uses.get(sticker ?? 'smile')! + 1);
	return Array.from({ length: count }, () => {
		const least = Math.min(...uses.values());
		const choices = names.filter((name) => uses.get(name) === least);
		const sticker = choices[Math.floor(random() * choices.length)];
		uses.set(sticker, least + 1);
		return sticker;
	});
}
