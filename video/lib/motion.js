// Timing curves and small numeric helpers. Everything on screen is a pure function of time, so a frame
// renders the same however many times it's asked for, and in any order.

export const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
export const lerp = (a, b, p) => a + (b - a) * p;

/** Progress from 0 to 1 while `t` goes from `start` to `start + length`. */
export const progress = (t, start, length) =>
	length <= 0 ? +(t >= start) : clamp((t - start) / length);

/** Maps `t` from one range onto another, clamped. */
export const remap = (t, inMin, inMax, outMin, outMax) =>
	lerp(outMin, outMax, clamp((t - inMin) / (inMax - inMin)));

export const ease = {
	linear: (p) => p,
	inQuad: (p) => p * p,
	outQuad: (p) => 1 - (1 - p) * (1 - p),
	inOutQuad: (p) => (p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2),
	inCubic: (p) => p ** 3,
	outCubic: (p) => 1 - (1 - p) ** 3,
	inOutCubic: (p) => (p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2),
	inQuart: (p) => p ** 4,
	outQuart: (p) => 1 - (1 - p) ** 4,
	inOutQuart: (p) => (p < 0.5 ? 8 * p ** 4 : 1 - (-2 * p + 2) ** 4 / 2),
	inQuint: (p) => p ** 5,
	outQuint: (p) => 1 - (1 - p) ** 5,
	inOutQuint: (p) => (p < 0.5 ? 16 * p ** 5 : 1 - (-2 * p + 2) ** 5 / 2),
	inExpo: (p) => (p <= 0 ? 0 : 2 ** (10 * p - 10)),
	outExpo: (p) => (p >= 1 ? 1 : 1 - 2 ** (-10 * p)),
	inOutExpo: (p) =>
		p <= 0 ? 0 : p >= 1 ? 1 : p < 0.5 ? 2 ** (20 * p - 10) / 2 : (2 - 2 ** (-20 * p + 10)) / 2,
	inSine: (p) => 1 - Math.cos((p * Math.PI) / 2),
	outSine: (p) => Math.sin((p * Math.PI) / 2),
	inOutSine: (p) => -(Math.cos(Math.PI * p) - 1) / 2,
	inBack: (p, s = 1.70158) => (s + 1) * p ** 3 - s * p * p,
	outBack: (p, s = 1.70158) => 1 + (s + 1) * (p - 1) ** 3 + s * (p - 1) ** 2,
	inOutBack: (p, s = 1.70158 * 1.525) =>
		p < 0.5
			? ((2 * p) ** 2 * ((s + 1) * 2 * p - s)) / 2
			: ((2 * p - 2) ** 2 * ((s + 1) * (p * 2 - 2) + s) + 2) / 2
};

/**
 * A cubic Bézier timing curve, as in CSS: x is time and y is progress. Solved for x with a few Newton steps
 * and bisection when the slope is too flat to trust.
 */
export function bezier(x1, y1, x2, y2) {
	const cx = 3 * x1;
	const bx = 3 * (x2 - x1) - cx;
	const ax = 1 - cx - bx;
	const cy = 3 * y1;
	const by = 3 * (y2 - y1) - cy;
	const ay = 1 - cy - by;
	const x = (s) => ((ax * s + bx) * s + cx) * s;
	const y = (s) => ((ay * s + by) * s + cy) * s;
	const dx = (s) => (3 * ax * s + 2 * bx) * s + cx;
	return (p) => {
		if (p <= 0) return 0;
		if (p >= 1) return 1;
		let s = p;
		for (let i = 0; i < 6; i++) {
			const slope = dx(s);
			if (Math.abs(slope) < 1e-6) break;
			s -= (x(s) - p) / slope;
		}
		if (Math.abs(x(s) - p) > 1e-4) {
			let lo = 0;
			let hi = 1;
			s = p;
			for (let i = 0; i < 30; i++) {
				if (x(s) < p) lo = s;
				else hi = s;
				s = (lo + hi) / 2;
			}
		}
		return y(s);
	};
}

// The house curves: a confident settle for things arriving, and a quick gather for things leaving.
export const settle = bezier(0.16, 1, 0.3, 1);
export const gather = bezier(0.7, 0, 0.84, 0);
export const glide = bezier(0.65, 0, 0.35, 1);

/**
 * A damped spring released from 0 toward 1, `t` seconds after release: overshoots and rings when the damping
 * is low. Stiffness and damping as in most UI spring APIs, with a mass of 1.
 */
export function spring(t, stiffness = 170, damping = 26) {
	if (t <= 0) return 0;
	const w0 = Math.sqrt(stiffness);
	const zeta = damping / (2 * w0);
	if (zeta < 1) {
		const wd = w0 * Math.sqrt(1 - zeta * zeta);
		return (
			1 - Math.exp(-zeta * w0 * t) * (Math.cos(wd * t) + ((zeta * w0) / wd) * Math.sin(wd * t))
		);
	}
	return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
}

// Named springs, from a soft float to a snappy pop.
export const springs = {
	pop: (t) => spring(t, 420, 16),
	snap: (t) => spring(t, 300, 22),
	bouncy: (t) => spring(t, 220, 12),
	soft: (t) => spring(t, 90, 16),
	lazy: (t) => spring(t, 60, 14)
};

/** A seeded random number generator (mulberry32), so every render scatters things identically. */
export function random(seed = 1) {
	let a = seed >>> 0;
	const next = () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
	next.range = (min, max) => min + next() * (max - min);
	next.pick = (list) => list[Math.floor(next() * list.length)];
	return next;
}

/** Smooth noise in [-1, 1]: a few detuned sines, plenty for drift and wobble. */
export function wave(t, seed = 0) {
	return (
		(Math.sin(t * 1.13 + seed * 1.7) * 0.5 +
			Math.sin(t * 2.31 + seed * 4.1) * 0.3 +
			Math.sin(t * 4.07 + seed * 2.9) * 0.2) /
		1
	);
}

/** Distance between two points. */
export const distance = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
