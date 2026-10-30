// Notifications that say nothing. A phone wakes on its lock screen, the minute rolls over, and BubbleBoard's
// notifications drop in, in the app's own words: something is new, never what or about whom. Then the phone
// steps aside, its screen goes dark, and the next scene picks it up.

import { el, css, place, words } from '../lib/dom.js';
import { clamp, lerp, ease, progress, springs, settle, spring, wave } from '../lib/motion.js';
import { appIcon, photo, colors } from '../lib/kit.js';
import { whip, motionBlur } from '../lib/fx.js';

export const lead = 0.4;

// Where the phone ends up, which is where the next scene's phone starts.
export const handoff = { x: 400, y: 560, width: 480 };

export function mount({ root, text, cue }) {
	const scene = el('div', { class: 'layer' });
	root.append(scene);
	const blur = motionBlur(scene);

	scene.append(
		el('div', {
			class: 'layer',
			style: {
				background: `radial-gradient(50rem 40rem at 70% 30%, rgb(124 92 255 / 0.3), transparent 70%),
radial-gradient(40rem 30rem at 20% 100%, rgb(76 195 255 / 0.18), transparent 70%), ${colors.ink}`
			}
		})
	);

	// The phone, drawn here rather than with a screenshot: its lock screen is made of live parts.
	const W = 500;
	const bezel = 15;
	const sw = W - bezel * 2;
	const sh = (sw * 844) / 390;
	const device = el('div', {
		class: 'phone',
		style: {
			width: `${W}px`,
			height: `${sh + bezel * 2}px`,
			borderRadius: `${W * 0.15}px`,
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
			background: '#000'
		}
	});
	// The whole screen and a margin for the blur, the photo cropped at its sides to cover it.
	const wallpaper = el('img', {
		src: photo('bubbles'),
		decoding: 'sync',
		style: {
			left: '-60px',
			top: '-40px',
			width: `${sw + 120}px`,
			height: `${sh + 80}px`,
			objectFit: 'cover',
			filter: 'blur(14px) saturate(1.2) brightness(0.62)'
		}
	});
	const shade = el('div', {
		style: {
			inset: 0,
			width: `${sw}px`,
			height: `${sh}px`,
			background:
				'linear-gradient(rgb(11 10 22 / 0.35), rgb(11 10 22 / 0.05) 40%, rgb(11 10 22 / 0.45))'
		}
	});
	const date = el('div', {
		style: {
			left: 0,
			width: `${sw}px`,
			top: '96px',
			textAlign: 'center',
			fontSize: '25px',
			fontWeight: 600,
			color: 'rgb(255 255 255 / 0.85)'
		}
	});
	date.textContent = text.date;

	// The clock, its minutes on rolling strips.
	const clock = el('div', {
		style: {
			left: 0,
			width: `${sw}px`,
			top: '128px',
			height: '150px',
			display: 'flex',
			justifyContent: 'center',
			fontSize: '138px',
			fontWeight: 300,
			color: 'white',
			letterSpacing: '-0.03em',
			lineHeight: '150px'
		}
	});
	const [hours, from, to] = text.clock;
	const digit = (chars) => {
		const cell = el('span', {
			style: { position: 'relative', display: 'inline-block', height: '150px', overflow: 'hidden' }
		});
		const strip = el('span', { style: { position: 'relative', display: 'block' } });
		chars.forEach((ch) =>
			strip.append(el('span', { style: { position: 'static', display: 'block' } }, ch))
		);
		cell.append(strip);
		clock.append(cell);
		return strip;
	};
	digit([hours]);
	digit([':']);
	const tens = digit(from[0] === to[0] ? [from[0]] : [from[0], to[0]]);
	const ones = digit([from[1], to[1]]);

	glass.append(wallpaper, shade, date, clock);

	// Notifications, newest on top.
	const cards = text.items.map((message) => {
		const card = el('div', {
			style: {
				left: '22px',
				width: `${sw - 44}px`,
				height: '146px',
				borderRadius: '32px',
				background: 'rgb(255 255 255 / 0.22)',
				border: '1.5px solid rgb(255 255 255 / 0.28)',
				boxShadow: '0 20px 40px -20px rgb(0 0 0 / 0.5)'
			}
		});
		const badge = appIcon(54);
		place(badge.node, { x: 20, y: 22 });
		const name = el('div', {
			style: { left: '90px', top: '22px', fontSize: '22px', fontWeight: 750, color: 'white' }
		});
		name.textContent = 'BubbleBoard';
		const when = el('div', {
			style: {
				right: '22px',
				top: '24px',
				fontSize: '19px',
				fontWeight: 500,
				color: 'rgb(255 255 255 / 0.7)'
			}
		});
		when.textContent = text.now;
		const body = el('div', {
			style: {
				left: '90px',
				top: '56px',
				width: `${sw - 44 - 110}px`,
				fontSize: '24px',
				fontWeight: 500,
				lineHeight: '1.3',
				color: 'white',
				textWrap: 'pretty'
			}
		});
		body.textContent = message;
		card.append(badge.node, name, when, body);
		glass.append(card);
		return card;
	});
	const dark = el('div', {
		style: { inset: 0, width: `${sw}px`, height: `${sh}px`, background: '#000' }
	});
	glass.append(dark);
	device.append(glass);
	scene.append(device);

	// The words on the right.
	const title = el('div', {
		class: 'display',
		style: {
			left: '1010px',
			top: '330px',
			fontSize: '104px',
			color: 'white',
			width: '820px',
			whiteSpace: 'normal'
		}
	});
	const titleWords = words(title, text.title);
	const sub = el('div', {
		style: {
			left: '1014px',
			top: `${330 + title.offsetHeight + 36}px`,
			width: '780px',
			fontSize: '40px',
			fontWeight: 500,
			lineHeight: '1.3',
			color: 'rgb(255 255 255 / 0.72)'
		}
	});
	const subWords = words(sub, text.sub);
	scene.append(title, sub);
	css(sub, { top: `${330 + title.offsetHeight + 36}px` });

	const arrive = [1.0, 1.5, 2.0];
	const ROLL = 0.55;

	cue(0.3, 'wake');
	cue(ROLL, 'tick', { pitch: 0.8 });
	arrive.forEach((at, i) => cue(at, 'chime', { pitch: [1, 1.122, 1.335][i] }));
	cue(3.35, 'swish');
	cue(3.75, 'lockscreen');

	return (t) => {
		const pan = whip(t, -0.4, 0.7, 1080);
		scene.style.transform = `translateY(${1080 - pan.x}px)`;
		blur(0, pan.speed);

		// The phone: tilted on the left, then over to where the next scene wants it.
		const move = ease.inOutCubic(progress(t, 3.2, 0.8));
		const cx = lerp(560, handoff.x, move);
		const cy = lerp(590, handoff.y, move);
		const scale = lerp(1, handoff.width / W, move);
		place(device, {
			x: cx - W / 2,
			y: cy - (sh + bezel * 2) / 2,
			perspective: 2200,
			rotateY: lerp(16 + wave(t * 0.7, 1) * 2, 0, move),
			rotate: lerp(-3, 0, move),
			scale
		});

		// The screen wakes; at the end it goes dark again.
		const wake = ease.outCubic(progress(t, 0.3, 0.35));
		const sleep = ease.inCubic(progress(t, 3.55, 0.4));
		dark.style.opacity = String(Math.max(1 - wake, sleep));
		wallpaper.style.transform = `scale(${lerp(1.1, 1, settle(progress(t, 0.3, 2)))})`;

		const roll = settle(progress(t, ROLL, 0.5));
		if (tens.children.length > 1) tens.style.transform = `translateY(${-roll * 150}px)`;
		ones.style.transform = `translateY(${-roll * 150}px)`;

		// Each new card drops in at the top and pushes the others down.
		const n = arrive.filter((a) => t >= a).length;
		cards.forEach((card, i) => {
			if (i >= n) {
				card.style.opacity = '0';
				return;
			}
			const order = n - 1 - i;
			const settleTo = 316 + order * 160;
			const since = t - arrive[n - 1];
			const before = 316 + (order - 1) * 160;
			let y = order === 0 ? settleTo : lerp(before, settleTo, spring(since, 380, 26));
			let scale = 1;
			let opacity = 1;
			if (order === 0) {
				const drop = springs.snap(t - arrive[i]);
				y = lerp(200, settleTo, drop);
				scale = lerp(0.85, 1, drop);
				opacity = clamp((t - arrive[i]) * 8);
			}
			css(card, { top: `${y}px`, transform: `scale(${scale})`, opacity });
		});

		titleWords.forEach((word, i) => {
			const p = settle(progress(t, 0.35 + i * 0.07, 0.8));
			const out = ease.inCubic(progress(t, 3.3 + i * 0.03, 0.4));
			css(word.inner, {
				transform: `translateY(${(1 - p) * 105 - out * 105}%)`,
				opacity: clamp(p * 2) * (1 - out)
			});
		});
		subWords.forEach((word, i) => {
			const p = settle(progress(t, 0.8 + i * 0.035, 0.7));
			const out = ease.inCubic(progress(t, 3.35, 0.35));
			css(word.inner, {
				transform: `translateY(${(1 - p) * 105 - out * 105}%)`,
				opacity: clamp(p * 2) * (1 - out)
			});
		});
	};
}
