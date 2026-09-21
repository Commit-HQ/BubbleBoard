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
/** The sticker a new cover starts with: the next one along, so a photo full of children isn't a wall of one face. */
export const nextSticker = (covers: number) => names[covers % names.length];
