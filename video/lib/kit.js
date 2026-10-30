// BubbleBoard's visual pieces, drawn for the stage: soap bubbles and their pop, the app icon, phones with real
// screens of the app, face stickers, notice papers and their pushpins, and the app's own line icons.

import { el, svg, css, place } from './dom.js';
import { clamp, lerp, ease } from './motion.js';

export const asset = (name) => `/src/lib/assets/${name}`;
/** A real screen of the app (src/lib/assets/explore), in the reel's language. */
export const screen = (name, lang) => `/src/lib/assets/explore/${name}-${lang}-780.webp`;
export const photo = (name) => `/src/lib/assets/photos/${name}-1280.avif`;

export const colors = {
	ink: '#16142b',
	muted: '#57546e',
	canvas: '#faf7ff',
	accent: '#7c5cff',
	blush: '#ff6fb1',
	apricot: '#ffb36b',
	sky: '#4cc3ff',
	mint: '#6fdcb4',
	sun: '#ffc85a',
	papers: {
		yellow: '#fff4c7',
		peach: '#ffe8d6',
		pink: '#ffe3f0',
		lilac: '#eee8ff',
		blue: '#e0f1ff',
		green: '#dff5e8'
	}
};

// The colours of the logo's soap bubble, which also run round a spotlit card in the app.
export const iridescent = ['#7c5cff', '#4cc3ff', '#6fdcb4', '#ffc85a', '#ff6fb1'];

let uid = 0;
const nextId = () => `k${uid++}`;

/**
 * The logo's soap bubble (src/lib/assets/bubble.svg) drawn inline, so its colours can swirl round the rim
 * while the highlights stay where the light is.
 */
export function bubble(size) {
	const id = nextId();
	const node = el('div', { class: 'bubble', style: { width: `${size}px`, height: `${size}px` } });
	node.innerHTML = `<svg viewBox="0 0 200 200" width="${size}" height="${size}" style="overflow:visible">
<defs>
<radialGradient id="film${id}"><stop offset=".7" stop-color="#fff" stop-opacity="0"/><stop offset=".94" stop-color="#fff" stop-opacity=".12"/><stop offset="1" stop-color="#fff" stop-opacity=".5"/></radialGradient>
<radialGradient id="edge${id}"><stop offset=".84" stop-color="#fff" stop-opacity="0"/><stop offset=".97" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity=".7"/></radialGradient>
<mask id="rim${id}"><circle cx="100" cy="100" r="99" fill="url(#edge${id})"/></mask>
<linearGradient id="a${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7c5cff"/><stop offset=".3" stop-color="#4cc3ff"/><stop offset=".5" stop-color="#6fdcb4"/><stop offset=".72" stop-color="#ffc85a"/><stop offset="1" stop-color="#ff6fb1"/></linearGradient>
<linearGradient id="b${id}" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff7ab8"/><stop offset=".45" stop-color="#ff7ab8" stop-opacity="0"/><stop offset="1" stop-color="#4cc3ff" stop-opacity=".8"/></linearGradient>
<filter id="soft${id}"><feGaussianBlur stdDeviation="1"/></filter>
</defs>
<circle cx="100" cy="100" r="99" fill="url(#film${id})"/>
<g mask="url(#rim${id})" opacity=".9"><g class="swirl"><circle cx="100" cy="100" r="99" fill="url(#a${id})"/><circle cx="100" cy="100" r="99" fill="url(#b${id})"/></g></g>
<circle cx="100" cy="100" r="98.6" fill="none" stroke="#fff" stroke-opacity=".75" stroke-width=".8"/>
<g fill="none" stroke="#fff" stroke-linecap="round" filter="url(#soft${id})"><path d="M26 76a78 78 0 0 1 46-49" stroke-width="5" stroke-opacity=".85"/><path d="M163 140a78 78 0 0 1-21 21" stroke-width="3" stroke-opacity=".5"/></g>
</svg>`;
	const swirl = node.querySelector('.swirl');
	return {
		node,
		size,
		/** Centre at x, y; `wobble` squashes it like a bubble in a breeze, `swirl` turns its colours. */
		set({ x, y, scale = 1, wobble = 0, swirl: turn = 0, opacity = 1, rotate = 0 }) {
			swirl.setAttribute('transform', `rotate(${turn} 100 100)`);
			place(node, {
				x: x - size / 2,
				y: y - size / 2,
				scaleX: scale * (1 + wobble),
				scaleY: scale * (1 - wobble),
				rotate,
				opacity
			});
		}
	};
}

/** The bubble as a plain picture: cheap enough to fill the air with. */
export function bubbleImage(size, { blur = 0 } = {}) {
	const node = el('img', {
		src: asset('bubble.svg'),
		decoding: 'sync',
		style: { width: `${size}px`, height: `${size}px`, filter: blur ? `blur(${blur}px)` : 'none' }
	});
	return node;
}

// The popped bubble (src/lib/assets/bubble-popped.svg), taken apart so each piece can fly.
const popArcs = [
	'M43.6 79.5A60 60 0 0 1 79.5 43.6',
	'M105.6 36.2A64 64 0 0 1 155.4 68',
	'M157.8 94.9A58 58 0 0 1 141 141',
	'M117.1 163.8A66 66 0 0 1 62.1 154.1',
	'M50.9 134.4A60 60 0 0 1 40 100'
];
const popSpikes = [
	[25.2, 86.8, 13.3, 84.7],
	[90.1, 24.7, 88.5, 12.8],
	[172.5, 77.1, 183.9, 73.5],
	[138, 165.8, 144, 176.2],
	[46.3, 153.7, 37.8, 162.2]
];
const popDrops = [
	[31.2, 51.8, 3.5],
	[143, 25.5, 4],
	[177, 128, 3],
	[84.7, 186.7, 3.5],
	[24.8, 127.4, 2.5],
	[52.5, 17.7, 2],
	[160.4, 172, 2]
];

/** A bubble popping: its rim breaks into arcs, sparks shoot out, and droplets fly and fade. */
export function pop(size) {
	const id = nextId();
	const node = el('div', { style: { width: `${size}px`, height: `${size}px` } });
	const root = svg('svg', {
		viewBox: '0 0 200 200',
		width: size,
		height: size,
		style: 'overflow:visible'
	});
	root.innerHTML = `<defs><linearGradient id="p${id}" gradientUnits="userSpaceOnUse" x1="30" y1="30" x2="170" y2="170"><stop offset="0" stop-color="#7c5cff"/><stop offset=".3" stop-color="#4cc3ff"/><stop offset=".5" stop-color="#6fdcb4"/><stop offset=".72" stop-color="#ffc85a"/><stop offset="1" stop-color="#ff6fb1"/></linearGradient></defs>`;
	const arcs = popArcs.map((d) =>
		root.appendChild(
			svg('path', {
				d,
				fill: 'none',
				stroke: `url(#p${id})`,
				'stroke-width': 5,
				'stroke-linecap': 'round',
				pathLength: 1
			})
		)
	);
	const spikes = popSpikes.map(([x1, y1, x2, y2]) =>
		root.appendChild(
			svg('line', {
				x1,
				y1,
				x2,
				y2,
				stroke: `url(#p${id})`,
				'stroke-width': 3.5,
				'stroke-linecap': 'round'
			})
		)
	);
	const drops = popDrops.map(([cx, cy, r]) =>
		root.appendChild(svg('circle', { cx, cy, r, fill: `url(#p${id})` }))
	);
	node.append(root);
	return {
		node,
		/** `p` runs from 0, the moment of the pop, to 1, when the last droplet is gone. */
		set(x, y, p, scale = 1) {
			const visible = p > 0 && p < 1;
			node.style.visibility = visible ? 'visible' : 'hidden';
			if (!visible) return;
			place(node, { x: x - size / 2, y: y - size / 2, scale });
			const out = ease.outQuart(p);
			const s = lerp(0.62, 1.18, out);
			const fade = 1 - ease.inQuad(clamp((p - 0.25) / 0.75));
			arcs.forEach((arc, i) => {
				const length = lerp(1, 0.25, ease.outCubic(p));
				arc.setAttribute('transform', `translate(${100 - 100 * s} ${100 - 100 * s}) scale(${s})`);
				arc.setAttribute('stroke-dasharray', `${length} 2`);
				arc.setAttribute('stroke-dashoffset', `${-(1 - length) / 2 - i * 0.02 * p}`);
				arc.setAttribute('stroke-width', lerp(6, 2, out));
				arc.setAttribute('opacity', fade);
			});
			spikes.forEach((spike, i) => {
				const [x1, y1] = popSpikes[i];
				const push = lerp(-0.25, 0.45, out);
				const ox = (x1 - 100) * push;
				const oy = (y1 - 100) * push;
				spike.setAttribute('transform', `translate(${ox} ${oy})`);
				spike.setAttribute('opacity', clamp(p * 12) * (1 - ease.inQuad(clamp((p - 0.15) / 0.5))));
			});
			drops.forEach((drop, i) => {
				const [cx, cy, r] = popDrops[i];
				const reach = lerp(0.55, 1.75 + (i % 3) * 0.2, out);
				drop.setAttribute('cx', 100 + (cx - 100) * reach);
				drop.setAttribute('cy', 100 + (cy - 100) * reach + 30 * ease.inQuad(p));
				drop.setAttribute('r', r * lerp(1.3, 0.4, p));
				drop.setAttribute('opacity', fade);
			});
		}
	};
}

/**
 * The app icon, taken apart: its sunrise square and its three bubbles, laid out on the icon's 64-unit grid
 * (src/lib/assets/favicon.svg). `size` is the square's side in pixels.
 */
export const iconBubbles = [
	{ x: 27, y: 36, r: 15, opacity: 1 },
	{ x: 46, y: 19, r: 7, opacity: 0.75 },
	{ x: 47, y: 45, r: 4.5, opacity: 0.55 }
];
export function appIcon(size) {
	const node = el('div', { style: { width: `${size}px`, height: `${size}px` } });
	const tile = el('div', {
		style: {
			width: `${size}px`,
			height: `${size}px`,
			borderRadius: `${(size * 20) / 64}px`,
			backgroundImage: 'var(--sunrise)',
			boxShadow: '0 30px 60px -24px rgb(124 92 255 / 0.55)'
		}
	});
	const dots = iconBubbles.map((b) => {
		const d = (b.r * 2 * size) / 64;
		return el('div', {
			style: {
				width: `${d}px`,
				height: `${d}px`,
				borderRadius: '50%',
				background: `rgb(255 255 255 / ${b.opacity})`,
				left: `${(b.x * size) / 64 - d / 2}px`,
				top: `${(b.y * size) / 64 - d / 2}px`
			}
		});
	});
	node.append(tile, ...dots);
	return { node, tile, dots, size };
}

/**
 * A phone with a real screen of the app in it, framed as on the landing page
 * (src/lib/components/Screenshot.svelte). `width` is the whole phone's width.
 */
export function phone(src, width = 380) {
	const bezel = width * 0.031;
	const screenWidth = width - 2 * bezel;
	const screenHeight = (screenWidth * 844) / 390;
	const height = screenHeight + 2 * bezel;
	const node = el('div', {
		class: 'phone',
		style: {
			width: `${width}px`,
			height: `${height}px`,
			borderRadius: `${width * 0.15}px`
		}
	});
	const screenNode = el('div', {
		class: 'phone-screen',
		style: {
			left: `${bezel}px`,
			top: `${bezel}px`,
			width: `${screenWidth}px`,
			height: `${screenHeight}px`,
			borderRadius: `${screenWidth * 0.128}px`
		}
	});
	const scroller = el('div', { style: { left: 0, top: 0, width: `${screenWidth}px` } });
	const image = el('img', {
		src,
		decoding: 'sync',
		style: { left: 0, top: 0, width: `${screenWidth}px`, height: `${(screenWidth * 1688) / 780}px` }
	});
	scroller.append(image);
	const glare = el('div', { class: 'phone-glare' });
	screenNode.append(scroller, glare);
	node.append(screenNode);
	return {
		node,
		screen: screenNode,
		scroller,
		image,
		glare,
		width,
		height,
		screenWidth,
		screenHeight,
		/** Scrolls the screen by `y` pixels of the phone's own size. */
		scroll(y) {
			scroller.style.transform = `translate3d(0, ${-y}px, 0)`;
		},
		/** Moves the glare across the glass as the phone turns. */
		shine(p) {
			glare.style.backgroundPosition = `${lerp(-300, 300, p)}px 0`;
			glare.style.backgroundSize = '300% 100%';
		}
	};
}

/**
 * Sets other words over a phone's screen of the app, which names the app's own made-up kindergarten. Each
 * patch is a box of the 780-pixel-wide screenshot, painted over with the background on either side of it
 * blended across, and its words in the app's font, at `at` as canvas text is anchored by `align`.
 */
export async function overwrite(device, patches) {
	await device.image.decode();
	const scale = device.screenWidth / 780;
	for (const { box, at, align = 'left', font, color, text } of patches) {
		const [x0, y0, x1, y1] = box;
		const w = x1 - x0;
		const h = y1 - y0;
		const canvas = el('canvas', {
			width: w,
			height: h,
			style: {
				position: 'absolute',
				left: `${x0 * scale}px`,
				top: `${y0 * scale}px`,
				width: `${w * scale}px`,
				height: `${h * scale}px`
			}
		});
		const ctx = canvas.getContext('2d', { willReadFrequently: true });
		ctx.drawImage(device.image, x0, y0, w, h, 0, 0, w, h);
		const pixels = ctx.getImageData(0, 0, w, h);
		const { data } = pixels;
		for (let row = 0; row < h; row++) {
			const left = row * w * 4;
			const right = left + (w - 1) * 4;
			for (let col = 1; col < w - 1; col++)
				for (let k = 0; k < 4; k++)
					data[left + col * 4 + k] = lerp(data[left + k], data[right + k], col / (w - 1));
		}
		ctx.putImageData(pixels, 0, 0);
		ctx.font = font;
		ctx.fillStyle = color;
		ctx.textAlign = align;
		ctx.fillText(text, at[0] - x0, at[1] - y0);
		device.scroller.append(canvas);
	}
}

/** A face sticker (src/lib/assets/face-*.svg) as it covers a face: round, with a white edge. */
export function sticker(name, size) {
	return el(
		'div',
		{
			class: 'sticker',
			style: {
				width: `${size}px`,
				height: `${size}px`,
				boxShadow: `0 0 0 ${size * 0.07}px white, 0 ${size * 0.12}px ${size * 0.25}px -${size * 0.05}px rgb(22 20 43 / 0.45)`
			}
		},
		el('img', { src: asset(`face-${name}.svg`), decoding: 'sync' })
	);
}

/** The pushpin a pinned notice hangs from, with its glint. */
export function pin(size = 40) {
	return el('div', {
		class: 'pin',
		style: { left: '0', top: '0', width: `${size}px`, height: `${size}px` }
	});
}

// Line icons from the app's own set (src/lib/components/Icon.svelte, adapted from Lucide).
export const icons = {
	arrowUp: 'M12 19V5M5 12l7-7 7 7',
	check: 'M20 6 9 17l-5-5',
	eye: 'M2.06 12.35a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-19.88 0M9 12a3 3 0 1 0 6 0 3 3 0 1 0-6 0',
	eyeOff:
		'M10.73 5.08a10.74 10.74 0 0 1 11.2 6.57 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-1.44 2.49M14.08 14.16a3 3 0 0 1-4.24-4.24M17.48 17.5a10.75 10.75 0 0 1-15.42-5.15 1 1 0 0 1 0-.7 10.75 10.75 0 0 1 4.45-5.14M2 2l20 20',
	heart:
		'M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7z',
	key: 'm15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4M21 2l-9.6 9.6M2 15.5a5.5 5.5 0 1 0 11 0 5.5 5.5 0 1 0-11 0',
	lock: 'M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2zM7 11V7a5 5 0 0 1 10 0v4',
	lockBody: 'M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z',
	lockShackle: 'M7 11V7a5 5 0 0 1 10 0v4',
	message: 'M7.9 20A9 9 0 1 0 4 16.1L2 22z',
	bell: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0',
	clock: 'M3 12a9 9 0 1 0 18 0 9 9 0 1 0-18 0M12 7v5l3 2',
	users:
		'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M5 7a4 4 0 1 0 8 0 4 4 0 1 0-8 0M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
	globe:
		'M2 12a10 10 0 1 0 20 0 10 10 0 1 0-20 0M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20M2 12h20',
	phone: 'M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM12 18h.01',
	pin: 'M12 17v5M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z',
	camera:
		'M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3zM9 13a3 3 0 1 0 6 0 3 3 0 1 0-6 0',
	smile: 'M2 12a10 10 0 1 0 20 0 10 10 0 1 0-20 0M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01',
	file: 'M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7zM14 2v4a2 2 0 0 0 2 2h4M10 9H8M16 13H8M16 17H8',
	github:
		'M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.4 5.4 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4M9 18c-4.51 2-5-2-7-2',
	x: 'M18 6 6 18M6 6l12 12',
	// Not in the app: a server, for what the host sees.
	server:
		'M4 3h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM4 13h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2zM6 7h.01M6 17h.01'
};

/**
 * One of the line icons, drawn on as `draw` goes from 0 to 1. Each icon is one path, so the stroke draws
 * its pieces in order.
 */
export function icon(name, size = 48, { color = 'currentColor', width = 2 } = {}) {
	const root = svg('svg', {
		class: 'icon',
		viewBox: '0 0 24 24',
		width: size,
		height: size,
		style: `color:${color};stroke-width:${width}`
	});
	const path = svg('path', { d: icons[name], pathLength: 1 });
	root.append(path);
	return {
		node: root,
		path,
		draw(p) {
			path.setAttribute('stroke-dasharray', '1 1');
			path.setAttribute('stroke-dashoffset', `${1 - clamp(p)}`);
		}
	};
}

/** Three dots bouncing while someone types. */
export function typing(color = colors.muted) {
	const node = el('div', { style: { width: '84px', height: '24px' } });
	const dots = [0, 1, 2].map((i) =>
		el('div', {
			style: {
				width: '18px',
				height: '18px',
				borderRadius: '50%',
				background: color,
				left: `${i * 30}px`,
				top: '3px'
			}
		})
	);
	node.append(...dots);
	return {
		node,
		set(t) {
			dots.forEach((dot, i) => {
				const phase = (t * 2.4 - i * 0.18) % 1;
				const lift = phase < 0.5 ? Math.sin(phase * Math.PI * 2) : 0;
				css(dot, { transform: `translateY(${-lift * 9}px)`, opacity: 0.45 + lift * 0.55 });
			});
		}
	};
}
