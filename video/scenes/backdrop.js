// The colour behind everything: the app's backdrop (body::before in src/lib/styles/app.css), a few soft
// glows of coral, violet, sky, and sun over the canvas, here drifting slowly.

import { el, css } from '../lib/dom.js';
import { wave } from '../lib/motion.js';

const glows = [
	{ color: 'rgb(255 138 101 / 0.5)', x: 1766, y: 65, size: 1150, seed: 1 },
	{ color: 'rgb(124 92 255 / 0.32)', x: 77, y: 324, size: 1230, seed: 2 },
	{ color: 'rgb(76 195 255 / 0.38)', x: 1440, y: 1080, size: 1300, seed: 3 },
	{ color: 'rgb(255 201 60 / 0.32)', x: 422, y: 1037, size: 920, seed: 4 }
];

export function backdrop() {
	const root = el('div', { class: 'layer', style: { zIndex: 0, background: 'var(--canvas)' } });
	const nodes = glows.map((glow) =>
		root.appendChild(
			el('div', {
				style: {
					width: `${glow.size}px`,
					height: `${glow.size}px`,
					left: `${glow.x - glow.size / 2}px`,
					top: `${glow.y - glow.size / 2}px`,
					background: `radial-gradient(closest-side, ${glow.color}, transparent)`
				}
			})
		)
	);
	return {
		root,
		update(t) {
			nodes.forEach((node, i) => {
				const { seed } = glows[i];
				css(node, {
					transform: `translate3d(${wave(t * 0.35, seed) * 140}px, ${wave(t * 0.3, seed + 7) * 90}px, 0) scale(${1 + wave(t * 0.25, seed + 3) * 0.08})`
				});
			});
		}
	};
}
