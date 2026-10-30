// Locked on your phone first. A parent's message leaves their phone, locks as it goes, and crosses the
// server as an unreadable jumble before it opens again on the teacher's phone. The server tries to look and
// can't: only the kindergarten's devices hold the keys.

import { el, svg, css, place, words } from '../lib/dom.js';
import { clamp, lerp, ease, progress, springs, settle, random, wave } from '../lib/motion.js';
import { icons, icon, colors } from '../lib/kit.js';
import { handoff } from './notify.js';

export const linger = 0.01;

const glyphs = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
/** A cipher character that changes a dozen times a second, the same in every render. */
const scramble = (i, t, salt = 0) => {
	const bucket = Math.floor(t * 12);
	const h = Math.imul(i * 7919 + bucket * 104729 + salt * 31, 2654435761) >>> 0;
	return glyphs[h % glyphs.length];
};

/** A phone with a small, drawn version of the app's conversation on it. */
function device(width, { name, initials, theirs }) {
	const bezel = width * 0.03;
	const sw = width - bezel * 2;
	const sh = (sw * 844) / 390;
	const node = el('div', {
		class: 'phone',
		style: {
			width: `${width}px`,
			height: `${sh + bezel * 2}px`,
			borderRadius: `${width * 0.15}px`,
			background: '#0b0a16',
			boxShadow: '0 80px 140px -40px rgb(0 0 0 / 0.8), 0 0 0 2px rgb(255 255 255 / 0.14) inset'
		}
	});
	const glass = el('div', {
		style: {
			left: `${bezel}px`,
			top: `${bezel}px`,
			width: `${sw}px`,
			height: `${sh}px`,
			borderRadius: `${sw * 0.13}px`,
			overflow: 'hidden',
			background: `radial-gradient(30rem 20rem at 90% 0%, rgb(255 138 101 / 0.35), transparent 70%),
radial-gradient(30rem 30rem at 0% 60%, rgb(124 92 255 / 0.25), transparent 70%), ${colors.canvas}`
		}
	});
	const avatar = el('div', {
		style: {
			left: '24px',
			top: '34px',
			width: '64px',
			height: '64px',
			borderRadius: '50%',
			background: 'var(--sunrise)',
			color: 'white',
			display: 'grid',
			placeItems: 'center',
			fontSize: '24px',
			fontWeight: 800
		}
	});
	avatar.textContent = initials;
	const title = el('div', {
		style: {
			left: '104px',
			top: '48px',
			fontSize: '28px',
			fontWeight: 750,
			color: colors.ink,
			whiteSpace: 'nowrap'
		}
	});
	title.textContent = name;
	const rule = el('div', {
		style: {
			left: 0,
			top: '124px',
			width: `${sw}px`,
			height: '2px',
			background: 'rgb(22 20 43 / 0.07)'
		}
	});
	const bubble = el('div', {
		style: {
			left: theirs ? '22px' : 'auto',
			right: theirs ? 'auto' : '22px',
			top: `${sh - 330}px`,
			width: `${sw - 60}px`,
			padding: '20px 24px',
			borderRadius: theirs ? '30px 30px 30px 8px' : '30px 30px 8px 30px',
			background: theirs ? 'white' : colors.ink,
			color: theirs ? colors.ink : 'white',
			fontSize: '27px',
			fontWeight: 500,
			lineHeight: '1.3',
			boxShadow: '0 20px 40px -20px rgb(22 20 43 / 0.45)'
		}
	});
	const input = el('div', {
		style: {
			left: '20px',
			top: `${sh - 110}px`,
			width: `${sw - 40}px`,
			height: '78px',
			borderRadius: '39px',
			background: 'rgb(255 255 255 / 0.85)',
			boxShadow: 'inset 0 0 0 2px rgb(22 20 43 / 0.06)'
		}
	});
	glass.append(avatar, title, rule, bubble, input);
	node.append(glass);
	return { node, bubble, width, height: sh + bezel * 2 };
}

export function mount({ root, text, copy, cue }) {
	const bg = el('div', {
		class: 'layer',
		style: {
			background: `radial-gradient(60rem 30rem at 50% 60%, rgb(111 220 180 / 0.12), transparent 70%),
radial-gradient(50rem 40rem at 50% 0%, rgb(124 92 255 / 0.28), transparent 70%), ${colors.ink}`
		}
	});
	const grid = el('div', {
		class: 'layer',
		style: {
			backgroundImage: 'radial-gradient(rgb(255 255 255 / 0.1) 1.6px, transparent 1.6px)',
			backgroundSize: '44px 44px'
		}
	});
	bg.append(grid);
	root.append(bg);
	const content = el('div', { class: 'layer' });
	root.append(content);

	// Headlines at the top: first the lock, then the peek, with the keys under it.
	const headline = (line, size) => {
		const node = el('div', {
			class: 'display',
			style: {
				left: 0,
				top: '70px',
				width: '1920px',
				textAlign: 'center',
				fontSize: `${size}px`,
				color: 'white'
			}
		});
		const parts = words(node, line);
		content.append(node);
		return parts;
	};
	const lockedWords = headline(text.title, 92);
	const peekWords = headline(text.peek, 92);
	const keys = el('div', {
		style: {
			left: 0,
			top: '190px',
			width: '1920px',
			textAlign: 'center',
			fontSize: '40px',
			fontWeight: 500,
			color: 'rgb(255 255 255 / 0.75)'
		}
	});
	const keysWords = words(keys, text.keys);
	content.append(keys);

	// The two phones, and the server between them.
	const W = 380;
	const left = device(W, {
		name: copy.messages.teacher,
		initials: copy.messages.initials,
		theirs: false
	});
	const right = device(W, { name: copy.qr.card, initials: copy.qr.initials, theirs: true });
	left.bubble.textContent = text.message;
	content.append(left.node, right.node);
	const message = [...text.message];
	const received = message.map((ch) => {
		const span = el('span', { style: { position: 'static' } }, ch);
		right.bubble.append(span);
		return span;
	});
	const L = { x: 330, y: 620 };
	const R = { x: 1590, y: 620 };

	const server = el('div', {
		style: {
			left: '800px',
			top: '440px',
			width: '320px',
			height: '370px',
			borderRadius: '36px',
			background: 'rgb(255 255 255 / 0.06)',
			border: '2px solid rgb(255 255 255 / 0.16)'
		}
	});
	const rack = icon('server', 96, { color: 'rgb(255 255 255 / 0.85)', width: 1.6 });
	place(rack.node, { x: 112, y: 30 });
	const jumble = el('div', {
		class: 'mono',
		style: {
			left: '28px',
			top: '146px',
			width: '264px',
			fontSize: '22px',
			lineHeight: '1.3',
			color: colors.mint,
			whiteSpace: 'pre'
		}
	});
	const label = el('div', {
		style: {
			left: 0,
			width: '320px',
			top: '386px',
			textAlign: 'center',
			fontSize: '28px',
			fontWeight: 700,
			color: 'rgb(255 255 255 / 0.8)'
		}
	});
	label.textContent = text.server;
	server.append(rack.node, jumble, label);
	content.append(server);
	// As many characters a row as the box holds, at least a little apart, spaced to reach both its edges.
	const probe = el('span', { style: { position: 'static' } }, glyphs.slice(0, 20));
	jumble.append(probe);
	const glyph = probe.offsetWidth / 20;
	probe.remove();
	const columns = Math.floor(264 / (glyph + 0.88));
	jumble.style.letterSpacing = `${264 / columns - glyph}px`;

	// Locks where the message leaves and arrives.
	const padlock = (x, y, color) => {
		const node = svg('svg', {
			class: 'icon',
			viewBox: '0 0 24 24',
			width: 76,
			height: 76,
			style: `left:${x - 38}px;top:${y - 38}px;color:${color};stroke-width:2.2`
		});
		const shackle = svg('path', { d: icons.lockShackle });
		const body = svg('path', { d: icons.lockBody, fill: 'currentColor', 'fill-opacity': 0.18 });
		node.append(shackle, body);
		content.append(node);
		return { node, shackle };
	};
	const P0 = { x: 560, y: 690 };
	const P2 = { x: 1360, y: 690 };
	const C = { x: 960, y: 430 };
	const lockOut = padlock(P0.x + 10, P0.y - 120, colors.mint);
	const lockIn = padlock(P2.x - 10, P2.y - 120, colors.mint);

	// The stream of characters.
	const rand = random(77);
	const stream = message.map((ch) => {
		const node = el('div', {
			class: 'mono',
			style: {
				fontSize: '34px',
				fontWeight: 600,
				color: 'white',
				width: '40px',
				textAlign: 'center'
			}
		});
		content.append(node);
		return { node, ch, wobble: rand.range(-1, 1), seed: rand() * 10, size: rand.range(0.8, 1.25) };
	});
	const emit = (i) => 0.95 + i * 0.045;
	const TRAVEL = 1.7;
	const along = (u) => {
		const a = (1 - u) * (1 - u);
		const b = 2 * (1 - u) * u;
		const c = u * u;
		return {
			x: a * P0.x + b * C.x + c * P2.x,
			y: a * P0.y + b * C.y + c * P2.y,
			dx: 2 * (1 - u) * (C.x - P0.x) + 2 * u * (P2.x - C.x),
			dy: 2 * (1 - u) * (C.y - P0.y) + 2 * u * (P2.y - C.y)
		};
	};

	// The eye that tries to read along, and the stroke that stops it.
	const eye = svg('svg', {
		class: 'icon',
		viewBox: '0 0 24 24',
		width: 150,
		height: 150,
		style: 'left:885px;top:300px;color:white;stroke-width:1.6'
	});
	const lid = svg('path', {
		d: 'M2.06 12.35a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-19.88 0',
		pathLength: 1
	});
	const pupil = svg('circle', { cx: 12, cy: 12, r: 3, fill: 'currentColor' });
	const slash = svg('path', {
		d: 'M3 3l18 18',
		pathLength: 1,
		stroke: colors.blush,
		'stroke-width': 2.4
	});
	eye.append(lid, pupil, slash);
	content.append(eye);

	// Keys, only on the phones.
	const keyBadge = (x, y) => {
		const node = el('div', {
			style: {
				left: `${x - 52}px`,
				top: `${y - 52}px`,
				width: '104px',
				height: '104px',
				borderRadius: '50%',
				background: colors.mint,
				boxShadow: '0 0 60px 10px rgb(111 220 180 / 0.45)'
			}
		});
		const k = icon('key', 56, { color: colors.ink, width: 2.4 });
		place(k.node, { x: 24, y: 24 });
		node.append(k.node);
		content.append(node);
		return { node, k };
	};
	const keyLeft = keyBadge(L.x + 170, L.y - 380);
	const keyRight = keyBadge(R.x - 170, R.y - 380);

	const PEEK = 4.1;
	cue(0, 'hum', { length: 7.5 });
	cue(0.8, 'lock');
	cue(0.95, 'data', { length: 2.7 });
	cue(emit(0) + TRAVEL, 'unlock');
	cue(PEEK, 'whoosh', { length: 0.6 });
	cue(PEEK + 0.35, 'blip', { count: 3, spacing: 0.18, pitch: 0.7 });
	cue(PEEK + 1.05, 'denied');
	cue(6.05, 'sparkle');
	cue(6.1, 'chime', { pitch: 1.5 });
	cue(7.2, 'riser', { length: 0.8 });

	return (t) => {
		grid.style.backgroundPosition = `${t * -12}px ${t * 8}px`;

		// Phones settle in from where the lock screen left off.
		const settleIn = settle(progress(t, 0, 0.9));
		const startScale = handoff.width / W;
		place(left.node, {
			x: lerp(handoff.x, L.x, settleIn) - W / 2,
			y: lerp(handoff.y, L.y, settleIn) - left.height / 2 + wave(t * 0.6, 3) * 5,
			scale: lerp(startScale, 1, settleIn)
		});
		const rightIn = springs.soft(t - 0.25);
		place(right.node, {
			x: R.x - W / 2 + (1 - rightIn) * 500,
			y: R.y - right.height / 2 + wave(t * 0.6, 8) * 5,
			opacity: clamp(rightIn * 3)
		});
		left.node.querySelector('div').style.filter =
			`brightness(${lerp(0, 1, ease.outCubic(progress(t, 0, 0.5)))})`;
		const serverIn = springs.snap(t - 0.45);
		css(server, {
			transform: `scale(${lerp(0.7, 1, serverIn)})`,
			opacity: clamp(serverIn * 2)
		});

		// Locks: the outgoing one closes, the incoming one opens when the first character arrives.
		const close = springs.pop(t - 0.8);
		lockOut.shackle.style.transform = `translateY(${lerp(-4, 0, t < 0.8 ? 0 : close)}px)`;
		css(lockOut.node, {
			opacity: clamp((t - 0.5) * 4),
			transform: `scale(${1 + Math.sin(clamp((t - 0.8) / 0.2) * Math.PI) * 0.15})`
		});
		const open = springs.pop(t - emit(0) - TRAVEL);
		lockIn.shackle.style.transform = `translateY(${t < emit(0) + TRAVEL ? 0 : lerp(0, -4, open)}px)`;
		css(lockIn.node, { opacity: clamp((t - 0.7) * 4) });

		// The stream: readable leaving, a jumble in between, readable again arriving.
		stream.forEach((s, i) => {
			const u = (t - emit(i)) / TRAVEL;
			if (u <= 0 || u >= 1) {
				s.node.style.opacity = '0';
				return;
			}
			const p = along(ease.inOutSine(u));
			const len = Math.hypot(p.dx, p.dy);
			const nx = -p.dy / len;
			const ny = p.dx / len;
			const off = Math.sin(u * Math.PI) * (s.wobble * 46 + wave(t * 2 + s.seed, i) * 10);
			const plain = u < 0.07 || u > 0.93;
			s.node.textContent = plain ? s.ch : scramble(i, t, 1);
			s.node.style.color = plain ? 'white' : i % 3 === 0 ? '#b9a8ff' : colors.mint;
			place(s.node, {
				x: p.x + nx * off - 20,
				y: p.y + ny * off - 22,
				scale: s.size * (0.7 + Math.sin(u * Math.PI) * 0.45),
				opacity: Math.min(1, u * 12, (1 - u) * 12)
			});
		});
		received.forEach((span, i) => {
			span.style.opacity = t > emit(i) + TRAVEL - 0.02 ? '1' : '0';
		});
		const firstIn = t > emit(0) + TRAVEL - 0.05;
		right.bubble.style.opacity = firstIn ? '1' : '0';
		right.bubble.style.transform = `scale(${firstIn ? springs.pop(t - emit(0) - TRAVEL) : 0})`;
		right.bubble.style.transformOrigin = '0% 100%';

		// The server sees only noise, busier while the stream crosses it.
		const busy = t > 1.6 && t < 4.6;
		let lines = '';
		for (let row = 0; row < 7; row++) {
			for (let col = 0; col < columns; col++)
				lines += scramble(row * columns + col, busy ? t : Math.floor(t * 3) / 3, 7);
			lines += '\n';
		}
		jumble.textContent = lines;
		jumble.style.opacity = String(busy ? 0.95 : 0.45);
		rack.draw(progress(t, 0.5, 0.8));

		// Headlines.
		lockedWords.forEach((word, i) => {
			const p = settle(progress(t, 0.2 + i * 0.07, 0.8));
			const out = ease.inCubic(progress(t, PEEK - 0.2 + i * 0.03, 0.4));
			css(word.inner, {
				transform: `translateY(${(1 - p) * 105 - out * 105}%)`,
				opacity: clamp(p * 2) * (1 - out)
			});
		});
		peekWords.forEach((word, i) => {
			const p = settle(progress(t, PEEK + 1.05 + i * 0.07, 0.8));
			css(word.inner, { transform: `translateY(${(1 - p) * 105}%)`, opacity: clamp(p * 2) });
		});
		keysWords.forEach((word, i) => {
			const p = settle(progress(t, 6.05 + i * 0.04, 0.7));
			css(word.inner, { transform: `translateY(${(1 - p) * 105}%)`, opacity: clamp(p * 2) });
		});

		// The eye opens over the server, looks about, and is struck out.
		lid.setAttribute('stroke-dasharray', '1 1');
		lid.setAttribute('stroke-dashoffset', `${1 - ease.outCubic(progress(t, PEEK + 0.1, 0.5))}`);
		const look =
			t < PEEK + 0.4
				? 0
				: Math.sin((t - PEEK - 0.4) * 9) * 3.2 * (1 - progress(t, PEEK + 1.0, 0.2));
		pupil.setAttribute('cx', String(12 + look));
		pupil.setAttribute('r', String(3 * clamp((t - PEEK - 0.3) * 5)));
		slash.setAttribute('stroke-dasharray', '1 1');
		slash.setAttribute('stroke-dashoffset', `${1 - ease.outCubic(progress(t, PEEK + 1.0, 0.25))}`);
		const shake =
			t > PEEK + 1.0
				? Math.sin((t - PEEK - 1.0) * 60) * 8 * (1 - clamp((t - PEEK - 1.0) / 0.3))
				: 0;
		css(eye, { opacity: t < PEEK ? 0 : 1, transform: `translateX(${shake}px)` });

		[keyLeft, keyRight].forEach((badge, i) => {
			const p = springs.pop(t - 6.05 - i * 0.12);
			css(badge.node, {
				transform: `scale(${t < 6.05 + i * 0.12 ? 0 : p}) rotate(${(1 - p) * -60}deg)`
			});
			badge.k.draw(progress(t, 6.15 + i * 0.12, 0.4));
		});

		// Everything but the dark goes, so the next scene can flip it away.
		content.style.opacity = String(1 - clamp((t - 7.0) / 0.4));
	};
}
