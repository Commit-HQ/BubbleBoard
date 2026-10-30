// QR cards instead of passwords. In the dark, a family's card flips in and its code ripples out from the
// middle, a real code made with the same library the app prints cards with. A camera's brackets close in, a
// line sweeps it, and the family is connected; a password field empties itself, dot by dot. Then the white
// card fills the frame and carries us into the light.

import encodeQR from '/node_modules/qr/index.js';
import { el, svg, css, place, words } from '../lib/dom.js';
import { clamp, lerp, ease, progress, springs, settle, distance } from '../lib/motion.js';
import { appIcon, icon, colors } from '../lib/kit.js';

export const linger = 0.35;

export function mount({ root, text, cue }) {
	const cx = 1270;
	const cy = 540;

	const dark = el('div', {
		class: 'layer',
		style: {
			background: `radial-gradient(60rem 40rem at 75% 40%, rgb(124 92 255 / 0.35), transparent 70%),
radial-gradient(50rem 40rem at 10% 90%, rgb(255 111 177 / 0.22), transparent 70%), ${colors.ink}`
		}
	});
	const grid = el('div', {
		class: 'layer',
		style: {
			backgroundImage: 'radial-gradient(rgb(255 255 255 / 0.13) 1.6px, transparent 1.6px)',
			backgroundSize: '44px 44px'
		}
	});
	dark.append(grid);
	root.append(dark);

	// Title and the password field that empties.
	const title = el('div', {
		class: 'display',
		style: {
			left: '120px',
			top: '300px',
			fontSize: '108px',
			color: 'white',
			width: '780px',
			whiteSpace: 'normal'
		}
	});
	const titleWords = words(title, text.title);
	const sub = el('div', {
		style: {
			left: '124px',
			top: '560px',
			fontSize: '38px',
			fontWeight: 500,
			color: 'rgb(255 255 255 / 0.72)'
		}
	});
	sub.textContent = text.sub;
	const field = el('div', {
		style: {
			left: '120px',
			top: '650px',
			width: '470px',
			height: '96px',
			borderRadius: '48px',
			background: 'rgb(255 255 255 / 0.08)',
			border: '2px solid rgb(255 255 255 / 0.18)'
		}
	});
	const dots = Array.from({ length: 8 }, (_, i) => {
		const dot = el('div', {
			style: {
				width: '22px',
				height: '22px',
				borderRadius: '50%',
				background: 'white',
				left: `${44 + i * 40}px`,
				top: '35px'
			}
		});
		field.append(dot);
		return dot;
	});
	const caret = el('div', {
		style: {
			width: '3px',
			height: '44px',
			top: '26px',
			background: colors.accent,
			borderRadius: '2px'
		}
	});
	field.append(caret);
	root.append(title, sub, field);

	// The card.
	const card = el('div', {
		style: {
			width: '560px',
			height: '680px',
			left: `${cx - 280}px`,
			top: `${cy - 340}px`,
			borderRadius: '44px',
			background: 'white',
			boxShadow: '0 60px 120px -30px rgb(0 0 0 / 0.6)'
		}
	});
	const badge = appIcon(64);
	place(badge.node, { x: 56, y: 48 });
	const brand = el('div', {
		style: {
			left: '138px',
			top: '58px',
			fontSize: '36px',
			fontWeight: 800,
			letterSpacing: '-0.03em'
		}
	});
	brand.textContent = 'BubbleBoard';
	const family = el('div', {
		style: {
			left: '0',
			width: '560px',
			top: '590px',
			textAlign: 'center',
			fontSize: '32px',
			fontWeight: 700,
			color: colors.ink
		}
	});
	family.textContent = text.card;
	card.append(badge.node, brand, family);

	// The library wants a quiet border of at least one module; the card's white is border enough.
	const matrix = encodeQR('https://bubbleboard.fyi', 'raw', { ecc: 'quartile', border: 1 })
		.slice(1, -1)
		.map((row) => row.slice(1, -1));
	const n = matrix.length;
	const box = 400;
	const cell = box / n;
	const code = svg('svg', {
		width: box,
		height: box,
		viewBox: `0 0 ${box} ${box}`,
		style: 'left:80px;top:160px'
	});
	const finder = (x, y) => (x < 7 && y < 7) || (x >= n - 7 && y < 7) || (x < 7 && y >= n - 7);
	const modules = [];
	matrix.forEach((row, y) =>
		row.forEach((on, x) => {
			if (!on) return;
			const rect = svg('rect', {
				x: x * cell + 0.4,
				y: y * cell + 0.4,
				width: cell - 0.8,
				height: cell - 0.8,
				rx: cell * 0.28,
				fill: finder(x, y) ? colors.accent : colors.ink
			});
			code.append(rect);
			modules.push({
				rect,
				cx: (x + 0.5) * cell,
				cy: (y + 0.5) * cell,
				delay: distance(x, y, n / 2, n / 2) * 0.03
			});
		})
	);
	card.append(code);
	root.append(card);

	// The camera's brackets and its sweep.
	const qx = cx - 280 + 80;
	const qy = cy - 340 + 160;
	const corners = [0, 1, 2, 3].map((k) => {
		const b = svg('svg', {
			width: 90,
			height: 90,
			viewBox: '0 0 90 90',
			style: 'overflow:visible'
		});
		b.innerHTML = `<path d="M8 60V20a12 12 0 0 1 12-12h40" fill="none" stroke="white" stroke-width="9" stroke-linecap="round"/>`;
		b.style.transformOrigin = '45px 45px';
		root.append(b);
		return b;
	});
	const beam = el('div', {
		style: {
			width: `${box + 60}px`,
			height: '6px',
			borderRadius: '3px',
			background: `linear-gradient(90deg, transparent, ${colors.mint}, white, ${colors.mint}, transparent)`,
			boxShadow: `0 0 30px 8px rgb(111 220 180 / 0.55)`
		}
	});
	root.append(beam);

	// Connected.
	const okay = el('div', {
		style: {
			width: '150px',
			height: '150px',
			borderRadius: '50%',
			background: colors.mint,
			boxShadow: '0 20px 60px -10px rgb(111 220 180 / 0.7)'
		}
	});
	const tick = icon('check', 96, { color: colors.ink, width: 3 });
	place(tick.node, { x: 27, y: 29 });
	okay.append(tick.node);
	const connected = el('div', {
		style: {
			fontSize: '40px',
			fontWeight: 800,
			color: colors.ink,
			left: '0',
			width: '560px',
			textAlign: 'center'
		}
	});
	connected.textContent = text.connected;
	root.append(okay);
	card.append(connected);

	cue(0, 'whoosh', { length: 0.6 });
	cue(0.35, 'swish');
	cue(0.6, 'blip', { count: 10, spacing: 0.05, pitch: 1.2 });
	cue(1.25, 'snap');
	cue(1.4, 'scan', { length: 0.6 });
	cue(2.0, 'success');
	cue(2.55, 'blip', { count: 8, spacing: 0.045, pitch: 2 });
	cue(3.3, 'whoosh', { length: 0.7 });

	return (t) => {
		// The dark arrives as a widening circle.
		const iris = ease.inOutCubic(progress(t, 0, 0.6));
		root.style.clipPath = iris < 1 ? `circle(${iris * 2300}px at 1500px 620px)` : 'none';
		grid.style.backgroundPosition = `0 ${t * 20}px`;

		titleWords.forEach((word, i) => {
			const p = settle(progress(t, 0.3 + i * 0.07, 0.8));
			css(word.inner, { transform: `translateY(${(1 - p) * 105}%)`, opacity: clamp(p * 2) });
		});
		const leave = clamp((t - 3.25) / 0.4);
		title.style.opacity = String(1 - leave);
		const subIn = settle(progress(t, 0.75, 0.7));
		css(sub, { opacity: subIn * (1 - leave), transform: `translateY(${(1 - subIn) * 30}px)` });
		const fieldIn = springs.snap(t - 0.9);
		css(field, {
			opacity: clamp(fieldIn) * (1 - leave),
			transform: `scale(${lerp(0.8, 1, fieldIn)})`
		});
		dots.forEach((dot, i) => {
			const gone = ease.inBack(progress(t, 2.55 + i * 0.045, 0.25));
			css(dot, { transform: `scale(${1 - gone}) translateY(${-gone * 20}px)` });
		});
		const typed = 8 - dots.filter((_, i) => t > 2.55 + i * 0.045 + 0.2).length;
		css(caret, {
			left: `${44 + typed * 40 - 14}px`,
			opacity: Math.floor(t * 2.5) % 2 ? 0.2 : 1
		});

		// The card flips in, and the code ripples out from its middle.
		const flip = springs.snap(t - 0.3);
		const zoom = ease.inExpo(progress(t, 3.25, 0.7));
		place(card, {
			x: (960 - cx) * zoom,
			perspective: 2000,
			rotateY: lerp(85, 0, flip),
			rotate: lerp(-6, 0, flip),
			scale: lerp(0.9, 1, flip) * lerp(1, 4.2, zoom),
			opacity: t < 0.3 ? 0 : 1
		});
		card.style.transformOrigin = `280px 360px`;
		for (const m of modules) {
			const p = springs.pop(t - 0.6 - m.delay);
			const s = t < 0.6 + m.delay ? 0 : p;
			m.rect.setAttribute(
				'transform',
				`translate(${m.cx} ${m.cy}) scale(${s}) translate(${-m.cx} ${-m.cy})`
			);
		}
		const contentFade = 1 - clamp((t - 3.25) / 0.25);
		code.style.opacity = String(contentFade * lerp(1, 0.12, ease.outCubic(progress(t, 2.0, 0.3))));
		brand.style.opacity = String(contentFade);
		badge.node.style.opacity = String(contentFade);
		family.style.opacity = String(contentFade * (1 - clamp((t - 2.0) / 0.15)));

		// Brackets close in from the corners of the frame, the beam sweeps, and everything turns mint.
		const close = springs.snap(t - 1.2);
		const done = t > 2.0;
		const pad = 26;
		const ends = [
			[qx - pad, qy - pad, 0],
			[qx + box + pad - 90, qy - pad, 90],
			[qx + box + pad - 90, qy + box + pad - 90, 180],
			[qx - pad, qy + box + pad - 90, 270]
		];
		const starts = [
			[40, 40],
			[1790, 40],
			[1790, 950],
			[40, 950]
		];
		const pulse = done ? springs.pop(t - 2.0) : 0;
		corners.forEach((corner, k) => {
			const [ex, ey, angle] = ends[k];
			const [sx, sy] = starts[k];
			const dirX = k === 0 || k === 3 ? -1 : 1;
			const dirY = k < 2 ? -1 : 1;
			place(corner, {
				x: lerp(sx, ex, close) + dirX * (done ? lerp(18, 0, pulse) : 0),
				y: lerp(sy, ey, close) + dirY * (done ? lerp(18, 0, pulse) : 0),
				rotate: angle,
				opacity: t < 1.2 ? 0 : contentFade
			});
			corner.querySelector('path').setAttribute('stroke', done ? colors.mint : 'white');
		});
		const sweep = ease.inOutSine(progress(t, 1.4, 0.6));
		place(beam, {
			x: qx - 30,
			y: qy + sweep * box - 3,
			opacity: t > 1.4 && t < 2.0 ? Math.sin(sweep * Math.PI) * 1.2 : 0
		});

		const ok = springs.pop(t - 2.0);
		place(okay, {
			x: cx - 75,
			y: qy + box / 2 - 75 - 34,
			scale: t < 2.0 ? 0 : ok * (1 - zoom),
			opacity: contentFade
		});
		tick.draw(progress(t, 2.1, 0.3));
		const label = springs.snap(t - 2.15);
		css(connected, {
			top: `${160 + box / 2 + 58 + (1 - label) * 30}px`,
			opacity: t < 2.15 ? 0 : clamp(label) * contentFade
		});

		// The white card has filled the frame; it fades to let the next scene through.
		root.style.opacity = String(1 - clamp((t - 4) / 0.35));
	};
}
