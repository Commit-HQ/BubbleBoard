import encodeQR from 'qr';

// A card's QR code as the app draws it: round dots and rounded finder patterns inside a soap bubble, with
// the app icon in the middle. Quartile error correction restores the modules the icon covers. From
// version 7 on, a code has an alignment pattern in its middle, so it goes without the icon. Units are
// modules, with the symbol from 0 to `size`.

export const dotRadius = 0.45;
export const bubbleWidth = 0.8;
/** Space between the code's corners and the bubble. */
const bubbleGap = 1.5;
/** Modules whose centres are this close to the middle are left out under the icon. */
const iconClearance = 5.2;
const iconSize = 7.2;

/** A square with rounded corners. */
export type Square = { x: number; y: number; size: number; radius: number };

export type QrDrawing = {
	size: number;
	/** The square the drawing fills, bubble included. */
	view: { x: number; y: number; size: number };
	/** The bubble's radius around the middle, to the centre of its outline. */
	bubble: number;
	/** The centres of the dark modules outside the finder patterns. */
	dots: [number, number][];
	/** Each finder pattern: a ring between `outer` and `hole`, around a solid `eye`. */
	finders: { outer: Square; hole: Square; eye: Square }[];
	/** Where the app icon goes, drawn from its 64-unit design with corners of 20. */
	icon?: Square;
};

export function drawQr(text: string): QrDrawing {
	// A one-module border, cut off again, leaves the symbol alone.
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
	const dots: [number, number][] = [];
	modules.forEach((row, y) =>
		row.forEach((dark, x) => {
			const finder = corners.some(([cx, cy]) => x >= cx && x < cx + 7 && y >= cy && y < cy + 7);
			const covered = withIcon && Math.hypot(x + 0.5 - middle, y + 0.5 - middle) < iconClearance;
			if (dark && !finder && !covered) dots.push([x + 0.5, y + 0.5]);
		})
	);
	const bubble = (middle + bubbleGap) * Math.SQRT2 + bubbleWidth / 2;
	const half = bubble + bubbleWidth / 2 + 0.25;
	return {
		size,
		view: { x: middle - half, y: middle - half, size: 2 * half },
		bubble,
		dots,
		finders: corners.map(([x, y]) => ({
			outer: { x, y, size: 7, radius: 2.2 },
			hole: { x: x + 1, y: y + 1, size: 5, radius: 1.4 },
			eye: { x: x + 2, y: y + 2, size: 3, radius: 1 }
		})),
		icon: withIcon
			? {
					x: middle - iconSize / 2,
					y: middle - iconSize / 2,
					size: iconSize,
					radius: (iconSize * 20) / 64
				}
			: undefined
	};
}
