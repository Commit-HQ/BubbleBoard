import encodeQR from 'qr';

// A card's QR code as the app draws it: a soap bubble full of dots. The code sits in the middle, with
// ring-shaped finder patterns and the app icon at its centre, and random dots fill the rest of the
// bubble. Scanners find a code by its finder patterns, so the filling keeps two modules from them and
// one from the code. Quartile error correction restores the modules the icon covers; from version 7 on,
// a code has an alignment pattern in its middle, so it goes without the icon. Units are modules, with
// the code from 0 to `size`.

export const dotRadius = 0.45;
export const bubbleWidth = 1;
/** The share of dark dots in the filling, about as many as in a code. */
const density = 0.45;
const codeGap = 1;
const finderGap = 2;
const iconRadius = 3.4;
/** Modules whose centres are this close to the middle are left out around the icon. */
const iconClearance = 4.4;

export type QrDrawing = {
	size: number;
	/** The square the drawing fills, bubble included. */
	view: { x: number; y: number; size: number };
	/** The bubble's radius around the middle, to the centre of its outline. */
	bubble: number;
	/** The centres of the dark dots: the code's modules outside its finder patterns, and the filling. */
	dots: [number, number][];
	/** The centres of the finder patterns: a ring from 3.5 to 2.5 modules out, around an eye of 1.5. */
	finders: [number, number][];
	/** The icon's radius around the middle, when the code has one. */
	icon?: number;
};

export function drawQr(text: string): QrDrawing {
	// A one-module border, cut off again, leaves the code alone.
	const modules = encodeQR(text, 'raw', { ecc: 'quartile', border: 1 })
		.slice(1, -1)
		.map((row) => row.slice(1, -1));
	const size = modules.length;
	const middle = size / 2;
	const withIcon = size <= 41;
	const corners = [
		[0, 0],
		[size - 7, 0],
		[0, size - 7]
	];
	/** Whether a module is within `gap` of a square of `width` modules from `left` and `top`. */
	const near = (x: number, y: number, [left, top]: number[], width: number, gap = 0) =>
		x >= left - gap && x < left + width + gap && y >= top - gap && y < top + width + gap;
	// The filling reaches just past the code's corners.
	const field = middle * Math.SQRT2 + 1;
	const chance = randomNumbers(text);
	const dots: [number, number][] = [];
	for (let y = Math.floor(middle - field); y < middle + field; y++) {
		for (let x = Math.floor(middle - field); x < middle + field; x++) {
			const filled = chance() < density;
			const distance = Math.hypot(x + 0.5 - middle, y + 0.5 - middle);
			if (distance > field) continue;
			const dark = near(x, y, [0, 0], size)
				? modules[y][x] &&
					!corners.some((corner) => near(x, y, corner, 7)) &&
					!(withIcon && distance < iconClearance)
				: filled &&
					!near(x, y, [0, 0], size, codeGap) &&
					!corners.some((corner) => near(x, y, corner, 7, finderGap));
			if (dark) dots.push([x + 0.5, y + 0.5]);
		}
	}
	const bubble = field + 1.2;
	const half = bubble + bubbleWidth / 2 + 0.25;
	return {
		size,
		view: { x: middle - half, y: middle - half, size: 2 * half },
		bubble,
		dots,
		finders: corners.map(([x, y]) => [x + 3.5, y + 3.5]),
		icon: withIcon ? iconRadius : undefined
	};
}

/** Numbers from 0 to 1 that are the same for the same text, so a card looks the same every time. */
function randomNumbers(text: string) {
	// FNV-1a seeds mulberry32.
	let state = 2166136261;
	for (let i = 0; i < text.length; i++) state = Math.imul(state ^ text.charCodeAt(i), 16777619);
	return () => {
		state = (state + 0x6d2b79f5) | 0;
		let t = Math.imul(state ^ (state >>> 15), 1 | state);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}
