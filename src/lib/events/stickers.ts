import smile from '$lib/assets/face-sticker.svg';
import star from '$lib/assets/face-star.svg';
import heart from '$lib/assets/face-heart.svg';
export const stickers = { smile, star, heart };
export type Sticker = keyof typeof stickers;
export const stickerUrl = (value?: string) => stickers[value as Sticker] ?? stickers.smile;
