// Effects shared by the scenes: a shockwave ring, a flash, letters flung apart, and air full of bubbles.

import { el, svg, css, place } from './dom.js';
import { clamp, lerp, ease, random, wave, progress } from './motion.js';
import { bubbleImage, iridescent } from './kit.js';

let uid = 0;

/** A thin iridescent ring racing outward, as from a pop. */
export function ring(maxRadius = 1200) {
	const id = `ring${uid++}`;
	const size = maxRadius * 2;
	const root = svg('svg', {
		width: size,
		height: size,
		viewBox: `0 0 ${size} ${size}`,
		style: 'overflow:visible'
	});
	root.innerHTML = `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">${iridescent
		.map((c, i) => `<stop offset="${i / (iridescent.length - 1)}" stop-color="${c}"/>`)
		.join('')}</linearGradient></defs>`;
	const circle = svg('circle', {
		cx: maxRadius,
		cy: maxRadius,
		r: 10,
		fill: 'none',
		stroke: `url(#${id})`
	});
	root.append(circle);
	return {
		node: root,
		/** Centred at x, y, `p` from 0 to 1 as it grows from `from` pixels to its full radius. */
		set(x, y, p, from = 100, width = 14) {
			const visible = p > 0 && p < 1;
			root.style.visibility = visible ? 'visible' : 'hidden';
			if (!visible) return;
			place(root, { x: x - maxRadius, y: y - maxRadius });
			const grow = ease.outQuart(p);
			circle.setAttribute('r', lerp(from, maxRadius, grow));
			circle.setAttribute('stroke-width', lerp(width, 1, grow));
			circle.setAttribute('opacity', 1 - ease.inQuad(p));
		}
	};
}

/** A soft white flash spreading from a point. */
export function flash(size = 2400, color = '255 255 255') {
	const node = el('div', {
		style: {
			width: `${size}px`,
			height: `${size}px`,
			borderRadius: '50%',
			background: `radial-gradient(closest-side, rgb(${color} / 1), rgb(${color} / 0.85) 40%, rgb(${color} / 0))`
		}
	});
	return {
		node,
		set(x, y, p, strength = 1) {
			const visible = p > 0 && p < 1;
			node.style.visibility = visible ? 'visible' : 'hidden';
			if (!visible) return;
			place(node, {
				x: x - size / 2,
				y: y - size / 2,
				scale: lerp(0.15, 1.2, ease.outCubic(p)),
				opacity: strength * (1 - ease.inOutQuad(p))
			});
		}
	};
}

/**
 * Flings `nodes` (laid out already) away from a centre: each gets a speed, a spin, and a little gravity,
 * and fades. `x0, y0` is the centre in the same coordinates as the nodes' offsets.
 */
export function fling(nodes, x0, y0, seed = 7, { speed = 1300, spin = 540, life = 0.9 } = {}) {
	const rand = random(seed);
	const parts = nodes.map((node) => {
		const cx = node.offsetLeft + node.offsetWidth / 2;
		const cy = node.offsetTop + node.offsetHeight / 2;
		let angle = Math.atan2(cy - y0, cx - x0);
		if (Math.abs(cx - x0) + Math.abs(cy - y0) < 1) angle = rand() * Math.PI * 2;
		angle += rand.range(-0.5, 0.5);
		const v = speed * rand.range(0.6, 1.2);
		return {
			node,
			vx: Math.cos(angle) * v,
			vy: Math.sin(angle) * v - rand.range(100, 500),
			spin: rand.range(-spin, spin),
			life: life * rand.range(0.75, 1.1)
		};
	});
	return (t) => {
		for (const part of parts) {
			if (t <= 0) {
				part.node.style.transform = 'none';
				part.node.style.opacity = '';
				continue;
			}
			const drag = 4;
			const reach = (1 - Math.exp(-drag * t)) / drag;
			const fall = 900 * t * t * 0.5;
			css(part.node, {
				transform: `translate(${part.vx * reach}px, ${part.vy * reach + fall}px) rotate(${part.spin * reach * 2}deg) scale(${lerp(1, 0.6, clamp(t / part.life))})`,
				opacity: 1 - ease.inQuad(clamp(t / part.life))
			});
		}
	};
}

/**
 * Bubbles drifting up through the frame on several planes: near ones big, soft, and quick, far ones small and
 * slow. Returns the layer and its update, which takes time and an optional burst: bubbles start at the
 * burst's centre at its moment and fly out before they drift.
 */
export function air(
	count = 18,
	seed = 3,
	{ burst, area = [0, 0, 1920, 1080], sizes = [24, 150] } = {}
) {
	const rand = random(seed);
	const layer = el('div', { class: 'layer' });
	const [ax, ay, aw, ah] = area;
	const items = Array.from({ length: count }, (_, i) => {
		const depth = rand();
		const size = lerp(sizes[0], sizes[1], depth ** 1.6);
		const blur = depth > 0.82 ? lerp(0, 9, (depth - 0.82) / 0.18) : depth < 0.15 ? 1.5 : 0;
		const node = bubbleImage(size, { blur });
		node.style.opacity = String(lerp(0.55, 0.95, depth));
		layer.append(node);
		return {
			node,
			size,
			x: ax + rand() * aw,
			y: ay + rand() * ah,
			rise: lerp(18, 90, depth),
			sway: rand.range(10, 40),
			phase: rand() * 10,
			angle: rand() * Math.PI * 2,
			throw: lerp(350, 1300, rand()) * (0.5 + depth),
			index: i
		};
	});
	return {
		layer,
		update(t) {
			for (const b of items) {
				let x = b.x + wave(t * 0.6 + b.phase, b.index) * b.sway;
				let y = b.y - b.rise * t;
				y =
					((((y - ay + b.size) % (ah + b.size * 2)) + ah + b.size * 2) % (ah + b.size * 2)) +
					ay -
					b.size;
				let scale = 1 + wave(t * 1.7 + b.phase, b.index + 9) * 0.03;
				if (burst) {
					const since = t - burst.t;
					const out = 1 - Math.exp(-3.2 * Math.max(0, since));
					const fromX = burst.x + Math.cos(b.angle) * b.throw;
					const fromY = burst.y + Math.sin(b.angle) * b.throw * 0.7;
					const settleIn = progress(since, 0.6, 1.6);
					x = lerp(lerp(burst.x, fromX, out), x, ease.inOutCubic(settleIn));
					y = lerp(lerp(burst.y, fromY, out), y, ease.inOutCubic(settleIn));
					scale *= since < 0 ? 0 : lerp(0.2, 1, ease.outBack(clamp(since / 0.45)));
				}
				b.node.style.transform = `translate3d(${x - b.size / 2}px, ${y - b.size / 2}px, 0) scale(${scale})`;
			}
		}
	};
}

let filters;

/**
 * Directional motion blur for a node: a Gaussian blur stretched along the motion, set from its speed in
 * pixels per second (a half-frame shutter at 60 fps).
 */
export function motionBlur(node) {
	if (!filters) {
		filters = svg('svg', { width: 0, height: 0, style: 'position:absolute;left:0;top:0' });
		document.getElementById('stage').append(filters);
	}
	const id = `blur${uid++}`;
	const filter = svg('filter', {
		id,
		x: '-25%',
		y: '-25%',
		width: '150%',
		height: '150%',
		'color-interpolation-filters': 'sRGB'
	});
	const blur = svg('feGaussianBlur', { stdDeviation: '0 0' });
	filter.append(blur);
	filters.append(filter);
	return (speedX, speedY = 0) => {
		const sx = Math.abs(speedX) / 120 / 2.2;
		const sy = Math.abs(speedY) / 120 / 2.2;
		if (sx < 0.4 && sy < 0.4) {
			node.style.filter = 'none';
			return;
		}
		blur.setAttribute('stdDeviation', `${sx.toFixed(2)} ${sy.toFixed(2)}`);
		node.style.filter = `url(#${id})`;
	};
}

/**
 * A whip pan between two scenes laid side by side: how far the camera has travelled at `t`, and how fast.
 * Both scenes call it with the same times, so they stay joined at the seam.
 */
export function whip(t, start, length, distance = 1920) {
	const at = (u) => distance * ease.inOutQuart(clamp((u - start) / length));
	const dt = 1 / 240;
	return { x: at(t), speed: (at(t + dt) - at(t - dt)) / (2 * dt) };
}
