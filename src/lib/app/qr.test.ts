import decodeQR from 'qr/decode.js';
import { describe, expect, it } from 'vitest';
import { cardLink } from '$lib/card';
import { createSecret } from '$lib/crypto';
import { bubbleWidth, dotRadius, drawQr, type QrDrawing } from './qr';

// A drawing is only as good as its scanning: these paint it as grey pixels and read it back with the
// decoder the app scans with. Dots need about three pixels a module; a camera sees a card's code far larger.

const origin = 'https://bubbleboard.example.com';

/** The drawing at `scale` pixels to a module, each pixel averaged from four samples. */
function paint(qr: QrDrawing, scale: number) {
	const dark = new Set(qr.dots.map(([x, y]) => `${x},${y}`));
	const middle = qr.size / 2;
	// The icon counts as solid mid-grey, darker than its white bubbles.
	const grey = (x: number, y: number) => {
		const fromMiddle = Math.hypot(x - middle, y - middle);
		if (qr.icon && fromMiddle <= qr.icon) return 150;
		const [cx, cy] = [Math.floor(x) + 0.5, Math.floor(y) + 0.5];
		if (dark.has(`${cx},${cy}`) && Math.hypot(x - cx, y - cy) <= dotRadius) return 60;
		for (const [fx, fy] of qr.finders) {
			const distance = Math.hypot(x - fx, y - fy);
			if (distance <= 1.5 || (distance >= 2.5 && distance <= 3.5)) return 60;
		}
		if (Math.abs(fromMiddle - qr.bubble) <= bubbleWidth / 2) return 170;
		return 255;
	};
	const width = Math.round(qr.view.size * scale);
	const data = new Uint8ClampedArray(width * width * 4);
	for (let py = 0; py < width; py++) {
		for (let px = 0; px < width; px++) {
			let sum = 0;
			for (const [sx, sy] of [
				[0.25, 0.25],
				[0.75, 0.25],
				[0.25, 0.75],
				[0.75, 0.75]
			]) {
				sum += grey(qr.view.x + (px + sx) / scale, qr.view.y + (py + sy) / scale);
			}
			const i = (py * width + px) * 4;
			data.fill(sum / 4, i, i + 3);
			data[i + 3] = 255;
		}
	}
	return { width, height: width, data };
}

describe('card QR codes', () => {
	it('read back as the card link, whatever dots fill the bubble', () => {
		for (const locale of ['hr', 'en', 'hr', 'en'] as const) {
			const link = cardLink(origin, locale, createSecret());
			const qr = drawQr(link);
			expect(qr.icon).toBeDefined();
			for (const scale of [3, 5]) {
				expect(decodeQR(paint(qr, scale)), `${link} at ${scale}px`).toBe(link);
			}
		}
	});

	it('look the same every time for the same card', () => {
		const link = cardLink(origin, 'hr', createSecret());
		expect(drawQr(link)).toEqual(drawQr(link));
	});

	it('leave the icon out when a long address needs a bigger code', () => {
		const link = cardLink(
			'https://bubbleboard.a-long-kindergarten-name.example.com',
			'en',
			createSecret()
		);
		const qr = drawQr(link);
		expect(qr.icon).toBeUndefined();
		for (const scale of [3, 5]) {
			expect(decodeQR(paint(qr, scale)), `at ${scale}px`).toBe(link);
		}
	});
});
