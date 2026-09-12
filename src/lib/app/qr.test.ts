import decodeQR from 'qr/decode.js';
import { describe, expect, it } from 'vitest';
import { cardLink } from '$lib/card';
import { createSecret } from '$lib/crypto';
import { bubbleWidth, dotRadius, drawQr, type QrDrawing, type Square } from './qr';

// A drawing is only as good as its scanning: these paint it as grey pixels and read it back with the
// decoder the app scans with. Dots need about three pixels a module; a camera sees a card's code far larger.

const origin = 'https://bubbleboard.example.com';

function inSquare({ x, y, size, radius }: Square, px: number, py: number) {
	const nearestX = Math.min(Math.max(px, x + radius), x + size - radius);
	const nearestY = Math.min(Math.max(py, y + radius), y + size - radius);
	return Math.hypot(px - nearestX, py - nearestY) <= radius;
}

/** The drawing at `scale` pixels to a module, each pixel averaged from nine samples. */
function paint(qr: QrDrawing, scale: number) {
	const dark = new Set(qr.dots.map(([x, y]) => `${x},${y}`));
	const middle = qr.size / 2;
	// The icon is counted as solid mid-grey, darker than its white bubbles.
	const grey = (x: number, y: number) => {
		if (qr.icon && inSquare(qr.icon, x, y)) return 150;
		const [cx, cy] = [Math.floor(x) + 0.5, Math.floor(y) + 0.5];
		if (dark.has(`${cx},${cy}`) && Math.hypot(x - cx, y - cy) <= dotRadius) return 60;
		const inFinder = qr.finders.some(
			({ outer, hole, eye }) =>
				inSquare(eye, x, y) || (inSquare(outer, x, y) && !inSquare(hole, x, y))
		);
		if (inFinder) return 60;
		if (Math.abs(Math.hypot(x - middle, y - middle) - qr.bubble) <= bubbleWidth / 2) return 170;
		return 255;
	};
	const width = Math.round(qr.view.size * scale);
	const data = new Uint8ClampedArray(width * width * 4);
	for (let py = 0; py < width; py++) {
		for (let px = 0; px < width; px++) {
			let sum = 0;
			for (let s = 0; s < 9; s++) {
				const x = qr.view.x + (px + ((s % 3) + 0.5) / 3) / scale;
				const y = qr.view.y + (py + (Math.floor(s / 3) + 0.5) / 3) / scale;
				sum += grey(x, y);
			}
			const i = (py * width + px) * 4;
			data.fill(sum / 9, i, i + 3);
			data[i + 3] = 255;
		}
	}
	return { width, height: width, data };
}

describe('card QR codes', () => {
	it('read back as the card link, with the icon in the middle', () => {
		for (const locale of ['hr', 'en'] as const) {
			const link = cardLink(origin, locale, createSecret());
			const qr = drawQr(link);
			expect(qr.icon).toBeDefined();
			for (const scale of [3, 4, 6]) {
				expect(decodeQR(paint(qr, scale)), `${locale} at ${scale}px`).toBe(link);
			}
		}
	});

	it('leave the icon out when a long address needs a bigger code', () => {
		const link = cardLink(
			'https://bubbleboard.a-long-kindergarten-name.example.com',
			'en',
			createSecret()
		);
		const qr = drawQr(link);
		expect(qr.icon).toBeUndefined();
		for (const scale of [3, 4]) {
			expect(decodeQR(paint(qr, scale)), `at ${scale}px`).toBe(link);
		}
	});
});
