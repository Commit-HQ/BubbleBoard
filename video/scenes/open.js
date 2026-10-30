// Cold open. “What did you do today?” “Nothing.” The answer every parent knows arrives as a chat bubble, an
// upside-down smiley flips beside it, and then the answer floats off as a soap bubble, trembles, and pops:
// out of “nothing” comes everything else.

import { el, css, place, words } from '../lib/dom.js';
import { clamp, lerp, ease, progress, springs, settle, glide, wave, remap } from '../lib/motion.js';
import { bubble, pop, sticker, typing, colors } from '../lib/kit.js';
import { ring, flash, fling, air } from '../lib/fx.js';

// The pop happens on the next scene's first beat, so this one stays a moment past its end.
export const linger = 1.2;
export const z = 30;

const POP = 8;

/** A chat bubble that first shows someone typing, then grows to fit what they wrote. */
function chat(parent, { text, dark, size, weight, side }) {
	const padX = size * 0.62;
	const padY = size * 0.42;
	const node = el('div', {
		style: {
			background: dark ? colors.ink : 'rgb(255 255 255 / 0.82)',
			border: dark ? 'none' : '2px solid rgb(255 255 255 / 0.95)',
			boxShadow: dark
				? '0 40px 80px -30px rgb(22 20 43 / 0.55)'
				: '0 40px 80px -36px rgb(46 32 120 / 0.45), inset 0 2px 0 white'
		}
	});
	const label = el('div', {
		style: {
			fontSize: `${size}px`,
			fontWeight: weight,
			color: dark ? 'white' : colors.ink,
			whiteSpace: 'nowrap',
			lineHeight: '1.15',
			letterSpacing: '-0.01em'
		}
	});
	const parts = words(label, text, { chars: true });
	const dots = typing(dark ? 'rgb(255 255 255 / 0.75)' : colors.muted);
	node.append(label, dots.node);
	parent.append(node);
	const textWidth = label.offsetWidth;
	const textHeight = label.offsetHeight;
	const full = { w: textWidth + padX * 2, h: textHeight + padY * 2 };
	const small = { w: 84 + padX * 1.6, h: full.h };
	return {
		node,
		label,
		parts,
		chars: parts.flatMap((part) => part.chars),
		full,
		/** `grow` from typing dots to the full text; `t` drives the dots. */
		frame({ x, y, appear, grow, t, round = 0, clear = 0, textScale = 1, rotate = 0 }) {
			const w = lerp(small.w, full.w, grow);
			const h = small.h;
			const width = lerp(w, round, round ? clear : 0);
			const height = lerp(h, round, round ? clear : 0);
			const radius = lerp(h * 0.36, height / 2, clear);
			const tail = lerp(size * 0.18, height / 2, clear);
			const left = side === 'right' ? x - width : x;
			css(node, {
				width: `${width}px`,
				height: `${height}px`,
				left: `${left}px`,
				top: `${y - height}px`,
				borderRadius:
					side === 'right'
						? `${radius}px ${radius}px ${tail}px ${radius}px`
						: `${radius}px ${radius}px ${radius}px ${tail}px`,
				transformOrigin: side === 'right' ? '100% 100%' : '0% 100%',
				transform: `scale(${lerp(0.35, 1, appear)}) rotate(${rotate}deg)`,
				opacity: clamp(appear * 3),
				background: dark ? colors.ink : `rgb(255 255 255 / ${0.82 * (1 - clear)})`,
				borderColor: `rgb(255 255 255 / ${0.95 * (1 - clear)})`,
				boxShadow:
					clear > 0
						? `0 40px 80px -36px rgb(46 32 120 / ${0.45 * (1 - clear)})`
						: node.style.boxShadow
			});
			css(label, {
				left: `${(width - textWidth * textScale) / 2}px`,
				top: `${(height - textHeight * textScale) / 2}px`,
				transformOrigin: '0 0',
				transform: `scale(${textScale})`
			});
			dots.set(t);
			css(dots.node, {
				left: `${(width - 84) / 2}px`,
				top: `${(height - 24) / 2}px`,
				opacity: 1 - clamp(grow * 2.5)
			});
			parts.forEach((part, i) => {
				const p = clamp((grow - 0.35 - i * 0.12) / 0.4);
				css(part.inner, {
					transform: `translateY(${lerp(0.9, 0, settle(p)) * size}px)`,
					opacity: clamp(p * 2)
				});
			});
		}
	};
}

export function mount({ root, text, cue }) {
	const cam = el('div', { class: 'layer' });
	const haze = air(9, 11, { sizes: [18, 110] });
	cam.append(haze.layer);
	root.append(cam);

	const question = chat(cam, {
		text: text.question,
		dark: true,
		size: 84,
		weight: 600,
		side: 'right'
	});
	const answer = chat(cam, {
		text: text.answer,
		dark: false,
		size: 150,
		weight: 800,
		side: 'left'
	});
	const smiley = sticker('sticker', 190);
	cam.append(smiley);

	const aside = el('div', {
		class: 'display',
		style: {
			fontSize: '84px',
			color: colors.muted,
			left: '0',
			top: '870px',
			width: '1920px',
			textAlign: 'center'
		}
	});
	const asideWords = words(aside, text.aside);
	cam.append(aside);

	// The soap bubble the answer turns into, and what's left when it pops.
	const D = 540;
	const soap = bubble(D);
	cam.append(soap.node);
	const burst = pop(D * 1.7);
	const shock = ring(1500);
	const glow = flash(2600);
	cam.append(shock.node, burst.node, glow.node);
	const shatter = fling(
		answer.chars,
		answer.label.offsetWidth / 2,
		answer.label.offsetHeight / 2,
		5,
		{
			speed: 1500,
			life: 0.8
		}
	);

	const fade = el('div', { class: 'layer', style: { background: 'var(--canvas)' } });
	root.append(fade);

	// Where things sit: the question high on the right, the answer low on the left.
	const qx = 1590;
	const qy = 420;
	const ax = 300;
	const ay = 770;

	cue(0.5, 'bloop', { pitch: 0.9 });
	cue(1.0, 'blip', { count: 4, spacing: 0.06 });
	cue(2.5, 'bloop', { pitch: 0.75 });
	cue(3.5, 'bloop', { pitch: 1.15 });
	cue(4.0, 'pop', { pitch: 1.6 });
	cue(4.5, 'swish');
	cue(5.0, 'shimmer');
	cue(5.5, 'pop', { pitch: 2.1 });
	cue(5.6, 'whoosh', { length: 1.2 });
	cue(6.0, 'riser', { length: 2 });
	cue(POP, 'popBig');

	return (t) => {
		fade.style.opacity = String(1 - ease.outCubic(progress(t, 0, 1.1)));
		haze.update(t + 4);

		// The camera leans in as the bubble gets ready to pop.
		const push = ease.inCubic(progress(t, 5.6, POP - 5.6));
		css(cam, {
			transformOrigin: '960px 540px',
			transform: `scale(${lerp(1, 1.24, push)})`
		});

		// The question: typing at half a second, written by one.
		const qAppear = springs.pop(t - 0.5);
		const qGrow = settle(progress(t, 1.0, 0.55));
		const qLeave = ease.inCubic(progress(t, 5.4, 0.7));
		question.frame({
			x: qx,
			y: qy - qLeave * 160,
			appear: t < 0.5 ? 0 : qAppear * (1 - qLeave),
			grow: qGrow,
			t
		});
		question.node.style.filter = qLeave > 0 ? `blur(${qLeave * 12}px)` : 'none';

		// The answer, after a pause long enough to be funny, then its trip into a soap bubble.
		const morph = glide(progress(t, 5.5, 1.3));
		const cx = lerp(ax + answer.full.w / 2, 960, morph);
		const cy = lerp(ay - answer.full.h / 2, 540, morph) + wave(t * 1.3, 4) * 10 * morph;
		const fit = Math.min(1, (D * 0.7) / answer.label.offsetWidth);
		const popped = t >= POP;
		const tremble = remap(t, 6.8, POP, 0, 1) ** 2;
		const jitter = tremble * 5;
		const swell = 1 + ease.inQuad(progress(t, POP - 0.3, 0.3)) * 0.12;
		answer.frame({
			x: cx - answer.full.w / 2 + Math.sin(t * 71) * jitter,
			y: cy + answer.full.h / 2 + Math.cos(t * 83) * jitter,
			appear: t < 2.5 ? 0 : springs.pop(t - 2.5),
			grow: settle(progress(t, 3.5, 0.5)),
			t,
			round: D * swell,
			clear: morph,
			textScale: lerp(1, fit * swell, morph)
		});
		// Anchor the answer by its centre once it's round, so the circle grows evenly.
		if (morph > 0) {
			const size = lerp(answer.full.w, D * swell, morph);
			const height = lerp(answer.full.h, D * swell, morph);
			css(answer.node, {
				left: `${cx - size / 2 + Math.sin(t * 71) * jitter}px`,
				top: `${cy - height / 2 + Math.cos(t * 83) * jitter}px`,
				width: `${size}px`,
				height: `${height}px`
			});
		}
		shatter(t - POP);

		soap.set({
			x: cx + Math.sin(t * 71) * jitter,
			y: cy + Math.cos(t * 83) * jitter,
			scale: swell * lerp(0.6, 1, morph),
			wobble: wave(t * 2.2, 3) * 0.025 + Math.sin(t * 38) * 0.035 * tremble,
			swirl: t * 40 + tremble * t * 120,
			opacity: popped ? 0 : clamp((morph - 0.2) / 0.5)
		});

		// The upside-down smiley: pops in upright, then flips.
		const sAppear = t < 4 ? 0 : springs.pop(t - 4);
		const sFlip = t < 4.5 ? 0 : springs.bouncy(t - 4.5);
		const sLeave = ease.inBack(progress(t, 5.4, 0.3));
		place(smiley, {
			x: ax + answer.full.w + 40,
			y: ay - answer.full.h / 2 - 95 - sLeave * 40,
			scale: sAppear * (1 - sLeave),
			rotate: sFlip * 180 + (1 - sAppear) * -30
		});

		// “We know that answer.”
		asideWords.forEach((word, i) => {
			const p = settle(progress(t, 5.0 + i * 0.07, 0.6));
			const out = ease.inCubic(progress(t, 6.0 + i * 0.04, 0.4));
			css(word.inner, {
				transform: `translateY(${(1 - p) * 90 + out * -40}px)`,
				opacity: p * (1 - out)
			});
		});

		// The pop.
		const since = t - POP;
		burst.set(960, 540, since / 0.75);
		shock.set(960, 540, since / 1.1, D / 2, 18);
		glow.set(960, 540, since / 0.55, 0.9);
	};
}
