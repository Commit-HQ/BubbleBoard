// The finale. Every real screen of the app, in the reel's language, on a wall the camera glides over:
// everything in one place. The wall is drawn into a single soap bubble, which pops into the end card.

import { el, css, place, words, shareGradient } from '../lib/dom.js';
import { clamp, lerp, ease, progress, springs, settle, random, wave } from '../lib/motion.js';
import { phone, screen, bubble, pop, appIcon, iconBubbles, colors } from '../lib/kit.js';
import { ring, flash, air } from '../lib/fx.js';

const shots = [
	'parent-board',
	'teacher-faces',
	'parent-messages',
	'teacher-classroom',
	'parent-gallery',
	'teacher-notice',
	'parent-meetings',
	'teacher-seen',
	'parent-consent',
	'teacher-preview',
	'parent-poll',
	'teacher-messages',
	'parent-devices',
	'teacher-meetings',
	'parent-report'
];

const POP = 4;

export function mount({ root, text, copy, lang, cue }) {
	// The wall, on a plane tilted away from the camera.
	const stage3d = el('div', {
		class: 'layer',
		style: { perspective: '1600px', perspectiveOrigin: '960px 400px' }
	});
	const wall = el('div', {
		style: {
			left: '-280px',
			top: '-560px',
			width: '2480px',
			height: '2200px',
			transformStyle: 'preserve-3d'
		}
	});
	stage3d.append(wall);
	root.append(stage3d);
	const COLS = 7;
	const ROWS = 3;
	const PW = 300;
	const gapX = 350;
	const gapY = 700;
	const phones = [];
	for (let r = 0; r < ROWS; r++) {
		for (let c = 0; c < COLS; c++) {
			const k = r * COLS + c;
			const device = phone(screen(shots[k % shots.length], lang), PW);
			const x = c * gapX + (r % 2) * (gapX / 2);
			const y = r * gapY;
			place(device.node, { x, y });
			wall.append(device.node);
			phones.push({ ...device, x, y, k, d: Math.hypot(c - 3, r - 1) });
		}
	}

	const veil = el('div', {
		class: 'layer',
		style: {
			background:
				'radial-gradient(46rem 20rem at 50% 47%, rgb(250 247 255 / 0.95), rgb(250 247 255 / 0.6) 55%, transparent)'
		}
	});
	root.append(veil);
	const title = el('div', {
		class: 'display',
		style: { left: 0, top: '430px', width: '1920px', textAlign: 'center', fontSize: '132px' }
	});
	const titleWords = words(title, text.title);
	root.append(title);

	// The bubble it all goes into, and its pop.
	const soap = bubble(420);
	const burst = pop(720);
	const shock = ring(1500);
	const glow = flash(2600);
	root.append(soap.node, shock.node, burst.node, glow.node);

	// The end card: the lockup from the opening, the address, and who made it.
	const card = el('div', { class: 'layer' });
	const haze = air(24, 33, { burst: { t: POP, x: 960, y: 520 }, sizes: [14, 150] });
	card.append(haze.layer);
	root.append(card);
	const S = 190;
	const wordmark = el('div', {
		style: {
			fontSize: '156px',
			fontWeight: 800,
			letterSpacing: '-0.035em',
			lineHeight: '1',
			whiteSpace: 'nowrap',
			color: colors.ink
		}
	});
	const mark = words(wordmark, 'BubbleBoard', { chars: true })[0];
	css(mark.mask, { padding: '0.15em 0.08em 0.25em', margin: '-0.15em -0.08em -0.25em' });
	card.append(wordmark);
	const gap = 52;
	const lockup = S + gap + wordmark.offsetWidth;
	const left = (1920 - lockup) / 2;
	const cy = 380;
	css(wordmark, { left: `${left + S + gap}px`, top: `${cy - wordmark.offsetHeight / 2 - 6}px` });
	const icon = appIcon(S);
	place(icon.node, { x: left, y: cy - S / 2 });
	card.append(icon.node);

	const tagline = el('div', {
		class: 'display',
		style: { left: 0, width: '1920px', textAlign: 'center', top: '540px', fontSize: '88px' }
	});
	const plain = el('span');
	const accent = el('span');
	tagline.append(plain, ' ', accent);
	card.append(tagline);
	const taglineWords = [...words(plain, copy.logo.tagline)];
	const accentWords = words(accent, copy.logo.accent);
	shareGradient(
		accentWords.map((w) => w.inner),
		accent,
		'linear-gradient(120deg, #5b3fe0, #c81e6e 60%, #c2410c)'
	);
	taglineWords.push(...accentWords);

	const url = el('div', {
		style: {
			left: 0,
			width: '1920px',
			top: '700px',
			textAlign: 'center',
			fontSize: '50px',
			fontWeight: 700,
			letterSpacing: '-0.01em',
			color: colors.accent
		}
	});
	card.append(url);
	const foot = el('div', {
		style: {
			left: 0,
			width: '1920px',
			top: '800px',
			display: 'flex',
			justifyContent: 'center',
			gap: '26px',
			fontSize: '32px',
			fontWeight: 600,
			color: colors.muted
		}
	});
	const footItems = [];
	text.foot.forEach((item, i) => {
		if (i) {
			const dot = el('span', { style: { position: 'static', color: colors.blush } }, '•');
			foot.append(dot);
			footItems.push(dot);
		}
		const span = el('span', { style: { position: 'static' } }, item);
		foot.append(span);
		footItems.push(span);
	});
	card.append(foot);

	const rand = random(12);
	const spins = phones.map(() => rand.range(-90, 90));

	cue(0, 'whoosh', { length: 0.8 });
	cue(0.15, 'blip', { count: 7, spacing: 0.06, pitch: 1 });
	cue(2.85, 'suck', { length: 1.1 });
	cue(3.2, 'riser', { length: 0.8 });
	cue(POP, 'popBig');
	cue(POP + 0.05, 'pop', { pitch: 1 });
	cue(POP + 0.17, 'pop', { pitch: 1.335 });
	cue(POP + 0.27, 'pop', { pitch: 1.5 });
	cue(POP + 0.55, 'blip', { count: 11, spacing: 0.03, pitch: 1.4 });
	cue(POP + 1.3, 'type', { length: 0.5 });
	cue(POP + 1.9, 'sparkle');

	return (t) => {
		// The camera glides over the wall; the phones arrive from the middle out, then rush into the bubble.
		const glideIn = settle(progress(t, -0.2, 3.2));
		css(wall, {
			transform: `translate3d(${lerp(-260, 60, glideIn)}px, ${lerp(120, -40, glideIn)}px, ${lerp(-500, 0, glideIn)}px) rotateX(30deg) rotateZ(-12deg)`
		});
		const gatherStart = 2.85;
		phones.forEach((p, i) => {
			const appear = springs.snap(t - p.d * 0.12);
			const g = ease.inCubic(progress(t, gatherStart + (3.2 - p.d) * 0.06, 0.6));
			css(p.node, {
				transform: `translate3d(${p.x}px, ${p.y}px, 0) rotate(${spins[i] * g}deg) scale(${lerp(0.7, 1, appear) * lerp(1, 0.4, g)})`,
				opacity: t < p.d * 0.12 ? 0 : clamp(appear * 2)
			});
			p.shine(progress(t, 0, 3) + p.d * 0.05);
		});
		// The whole wall is drawn into the middle, turning as it goes.
		const gather = ease.inQuart(progress(t, gatherStart, 1.0));
		css(stage3d, {
			transformOrigin: '960px 540px',
			transform: `scale(${lerp(1, 0.01, gather)}) rotate(${gather * 50}deg)`,
			opacity: 1 - clamp((gather - 0.85) / 0.15),
			visibility: t < POP ? 'visible' : 'hidden'
		});

		const titleOut = ease.inCubic(progress(t, 2.7, 0.35));
		titleWords.forEach((word, i) => {
			const p = settle(progress(t, 0.45 + i * 0.08, 0.8));
			css(word.inner, {
				transform: `translateY(${(1 - p) * 105 - titleOut * 105}%)`,
				opacity: clamp(p * 2) * (1 - titleOut)
			});
		});
		veil.style.opacity = String(1 - titleOut);

		// The bubble swells as the screens pour in, trembles, and pops.
		const swell = springs.soft(t - 3.0);
		const tremble = clamp((t - 3.55) / 0.45) ** 2;
		const popped = t >= POP;
		soap.set({
			x: 960 + Math.sin(t * 71) * tremble * 5,
			y: 540 + Math.cos(t * 83) * tremble * 5,
			scale: (t < 3 ? 0 : swell) * (1 + ease.inQuad(progress(t, POP - 0.25, 0.25)) * 0.12),
			wobble: wave(t * 2.4, 2) * 0.03 + Math.sin(t * 40) * 0.04 * tremble,
			swirl: t * 90,
			opacity: popped ? 0 : 1
		});
		burst.set(960, 540, (t - POP) / 0.8, 1.2);
		shock.set(960, 540, (t - POP) / 1.1, 220, 18);
		glow.set(960, 540, (t - POP) / 0.6, 0.95);

		// The end card.
		card.style.visibility = popped ? 'visible' : 'hidden';
		haze.update(t);
		const iconIn = springs.snap(t - POP - 0.02);
		css(icon.tile, {
			transform: `scale(${popped ? iconIn : 0}) rotate(${(1 - springs.soft(t - POP)) * -14}deg)`
		});
		icon.dots.forEach((dot, i) => {
			const at = POP + [0.05, 0.17, 0.27][i];
			const p = springs.pop(t - at);
			css(dot, {
				transform: `scale(${t < at ? 0 : p})`,
				opacity: t < at ? 0 : iconBubbles[i].opacity
			});
		});
		mark.chars.forEach((ch, i) => {
			const p = settle(progress(t, POP + 0.5 + i * 0.03, 0.6));
			css(ch, {
				transform: `translateY(${(1 - p) * 110}%) rotate(${(1 - p) * 12}deg)`,
				opacity: clamp(p * 3)
			});
		});
		taglineWords.forEach((word, i) => {
			const p = settle(progress(t, POP + 0.85 + i * 0.08, 0.8));
			css(word.inner, { transform: `translateY(${(1 - p) * 105}%)`, opacity: clamp(p * 2) });
		});
		const typed = Math.round(text.url.length * clamp((t - POP - 1.3) / 0.5));
		url.textContent =
			text.url.slice(0, typed) +
			(t > POP + 1.25 && t < POP + 2.6 && Math.floor(t * 3) % 2 ? '|' : '');
		url.style.opacity = t > POP + 1.25 ? '1' : '0';
		footItems.forEach((item, i) => {
			const p = settle(progress(t, POP + 1.85 + i * 0.07, 0.6));
			css(item, {
				opacity: p,
				transform: `translateY(${(1 - p) * 24}px)`,
				display: 'inline-block'
			});
		});

		// The air settles at the very end.
		const end = ease.inOutSine(progress(t, 7.2, 0.8));
		card.style.transform = `scale(${1 + end * 0.02})`;
	};
}
