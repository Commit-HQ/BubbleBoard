// Photos with care. A classroom photo opens, the teacher's phone finds the faces, and the app's own stickers
// pop onto them one by one. Then one sticker peels away, because a family always sees its own child, and
// the colours of the logo's bubble run round her face as they do round a spotlit card in the app.

import { el, svg, css, place, words, shareGradient } from '../lib/dom.js';
import { clamp, lerp, ease, progress, springs, settle, wave } from '../lib/motion.js';
import { photo, sticker, icon, asset, colors, iridescent } from '../lib/kit.js';
import { whip, motionBlur } from '../lib/fx.js';

export const linger = 0.25;

// Faces in the 1280-pixel classroom photo, in the order the scan finds them; the sixth is the family's own.
const faces = [
	{ x: 395, y: 688, r: 64, face: 'bear' },
	{ x: 315, y: 815, r: 70, face: 'cat' },
	{ x: 676, y: 712, r: 64, face: 'fox' },
	{ x: 480, y: 930, r: 74, face: 'bunny' },
	{ x: 910, y: 708, r: 64, face: 'frog' },
	{ x: 660, y: 1030, r: 76, face: 'flower' },
	{ x: 890, y: 950, r: 74, face: 'penguin' }
];
const OWN = 5;

export function mount({ root, text, cue }) {
	const scene = el('div', { class: 'layer' });
	root.append(scene);
	const blur = motionBlur(scene);

	// The photo's frame, and the plane inside it that holds the photo and everything placed on faces.
	const F = { x: 90, y: 140, size: 800 };
	const S = 0.8;
	const L = -90;
	const T = F.size - 1280 * S;
	const frame = el('div', {
		style: {
			left: `${F.x}px`,
			top: `${F.y}px`,
			width: `${F.size}px`,
			height: `${F.size}px`,
			borderRadius: '48px',
			overflow: 'hidden',
			boxShadow: '0 60px 120px -40px rgb(46 32 120 / 0.55)'
		}
	});
	const zoom = el('div', {
		style: { left: 0, top: 0, width: `${F.size}px`, height: `${F.size}px` }
	});
	const plane = el('div', {
		style: {
			left: 0,
			top: 0,
			width: '1280px',
			height: '1280px',
			transformOrigin: '0 0',
			transform: `translate(${L}px, ${T}px) scale(${S})`
		}
	});
	const image = el('img', {
		src: photo('classroom'),
		decoding: 'sync',
		style: { left: 0, top: 0, width: '1280px', height: '1280px' }
	});
	plane.append(image);
	zoom.append(plane);
	frame.append(zoom);
	scene.append(frame);

	// The scan's band of light.
	const band = el('div', {
		style: {
			left: '-600px',
			top: '-600px',
			width: '300px',
			height: '2400px',
			background:
				'linear-gradient(90deg, transparent, rgb(255 255 255 / 0.12) 40%, rgb(255 255 255 / 0.55) 50%, rgb(111 220 180 / 0.9) 51%, transparent 53%)',
			transformOrigin: '150px 1200px'
		}
	});
	frame.append(band);

	// Per face: a dashed ring while it's found, then its sticker.
	const rings = faces.map((f) => {
		const ring = svg('svg', {
			width: f.r * 2 + 60,
			height: f.r * 2 + 60,
			viewBox: `0 0 ${f.r * 2 + 60} ${f.r * 2 + 60}`,
			style: `left:${f.x - f.r - 30}px;top:${f.y - f.r - 30}px;overflow:visible`
		});
		const circle = svg('circle', {
			cx: f.r + 30,
			cy: f.r + 30,
			r: f.r + 16,
			fill: 'none',
			stroke: 'white',
			'stroke-width': 6,
			'stroke-linecap': 'round',
			'stroke-dasharray': '14 12'
		});
		ring.append(circle);
		plane.append(ring);
		return { ring, circle };
	});
	const stickers = faces.map((f) => {
		const node = sticker(f.face, f.r * 2);
		css(node, { left: `${f.x - f.r}px`, top: `${f.y - f.r}px` });
		plane.append(node);
		return node;
	});

	// The colours of the logo's bubble, running round the family's own child.
	const own = faces[OWN];
	const halo = el('div', {
		style: {
			left: `${own.x - own.r - 22}px`,
			top: `${own.y - own.r - 22}px`,
			width: `${own.r * 2 + 44}px`,
			height: `${own.r * 2 + 44}px`,
			borderRadius: '50%',
			padding: '9px',
			background: `conic-gradient(from 0deg, ${[...iridescent, iridescent[0]].join(', ')})`,
			mask: 'linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0)',
			webkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
			webkitMaskComposite: 'xor'
		}
	});
	const haloGlow = el('div', {
		style: {
			left: `${own.x - own.r - 30}px`,
			top: `${own.y - own.r - 30}px`,
			width: `${own.r * 2 + 60}px`,
			height: `${own.r * 2 + 60}px`,
			borderRadius: '50%',
			background: `conic-gradient(from 0deg, ${[...iridescent, iridescent[0]].join(', ')})`,
			filter: 'blur(18px)',
			mask: 'radial-gradient(closest-side, transparent 72%, #000 80%)',
			webkitMask: 'radial-gradient(closest-side, transparent 72%, #000 80%)'
		}
	});
	plane.insertBefore(haloGlow, stickers[0]);
	plane.insertBefore(halo, stickers[0]);

	// “Your child”, on a little tag.
	const tag = el('div', {
		style: {
			height: '64px',
			padding: '0 26px 0 18px',
			borderRadius: '32px',
			background: 'white',
			boxShadow: '0 16px 40px -12px rgb(22 20 43 / 0.45)',
			display: 'flex',
			alignItems: 'center',
			gap: '10px',
			fontSize: '30px',
			fontWeight: 700,
			color: colors.ink,
			whiteSpace: 'nowrap'
		}
	});
	const heart = icon('heart', 34, { color: colors.blush, width: 2.6 });
	heart.node.style.position = 'static';
	heart.path.setAttribute('fill', colors.blush);
	const tagText = el('span', { style: { position: 'static' } });
	tagText.textContent = text.yours;
	tag.append(heart.node, tagText);
	plane.append(tag);

	// The count of faces found, over the photo.
	const counter = el('div', {
		class: 'glass',
		style: {
			left: '26px',
			top: '26px',
			height: '74px',
			borderRadius: '37px',
			padding: '0 28px 0 12px',
			display: 'flex',
			alignItems: 'center',
			gap: '14px',
			background: 'rgb(255 255 255 / 0.78)',
			fontSize: '25px',
			fontWeight: 650,
			whiteSpace: 'nowrap'
		}
	});
	const number = el('span', {
		style: {
			position: 'static',
			width: '52px',
			height: '52px',
			borderRadius: '50%',
			background: colors.accent,
			color: 'white',
			display: 'grid',
			placeItems: 'center',
			fontSize: '28px',
			fontWeight: 800
		}
	});
	const counterText = el('span', { style: { position: 'static' } });
	counterText.textContent = text.found;
	counter.append(number, counterText);
	frame.append(counter);

	// The words on the right.
	const kicker = el('div', {
		style: {
			left: '985px',
			top: '200px',
			display: 'flex',
			alignItems: 'center',
			gap: '16px',
			fontSize: '36px',
			fontWeight: 750,
			color: colors.accent,
			whiteSpace: 'nowrap'
		}
	});
	const kickerFace = el('img', {
		src: asset('face-sticker.svg'),
		decoding: 'sync',
		style: { position: 'static', width: '54px', height: '54px', borderRadius: '50%' }
	});
	const kickerText = el('span', { style: { position: 'static' } });
	kickerText.textContent = text.stickers;
	kicker.append(kickerFace, kickerText);
	scene.append(kicker);

	const title = el('div', {
		class: 'display',
		style: { left: '980px', top: '300px', width: '900px', fontSize: '92px', whiteSpace: 'normal' }
	});
	const first = el('div', { class: 'flow' });
	const second = el('div', { class: 'flow' });
	title.append(first, second);
	scene.append(title);
	const firstWords = words(first, text.title[0]);
	const secondWords = words(second, text.title[1]);
	shareGradient(
		secondWords.map((w) => w.inner),
		second,
		'linear-gradient(120deg, #5b3fe0, #c81e6e 60%, #c2410c)'
	);
	const caption = el('div', {
		style: {
			left: '984px',
			top: `${300 + title.offsetHeight + 44}px`,
			fontSize: '44px',
			fontWeight: 500,
			color: colors.muted,
			whiteSpace: 'nowrap'
		}
	});
	const captionWords = words(caption, text.own);
	scene.append(caption);

	// When the band reaches each face.
	const found = faces.map((f) => {
		const along = (f.x - 250 + (f.y - 650) * 0.55) / 900;
		return 0.65 + clamp(along) * 0.75;
	});
	const popAt = faces.map((_, i) => 1.5 + i * 0.125);
	const PEEL = 3.45;
	const notes = [1, 1.125, 1.25, 1.5, 1.667, 2, 2.25];

	cue(0, 'whoosh', { length: 0.6 });
	cue(0.6, 'scan', { length: 0.85 });
	found.forEach((at, i) => cue(at, 'tick', { pitch: 1.5 + i * 0.1 }));
	popAt.forEach((at, i) => cue(at, 'pop', { pitch: notes[i] }));
	cue(1.6, 'shimmer');
	cue(PEEL, 'peel');
	cue(PEEL + 0.35, 'chime');
	cue(5.4, 'whip', { length: 0.8 });

	return (t) => {
		// The photo opens as a circle from its middle, settling as it does.
		const open = ease.inOutCubic(progress(t, 0, 0.7));
		frame.style.clipPath = open < 1 ? `circle(${open * 580}px at 50% 50%)` : 'none';
		const settleIn = settle(progress(t, 0, 2.4));
		css(zoom, {
			transformOrigin: '400px 470px',
			transform: `scale(${lerp(1.2, 1, settleIn) + wave(t * 0.4, 6) * 0.004})`
		});

		// The band sweeps across, and each face it passes gets its ring.
		const sweep = ease.inOutSine(progress(t, 0.55, 0.95));
		place(band, {
			x: lerp(-200, 1200, sweep),
			y: 0,
			rotate: 24,
			opacity: t > 0.55 && t < 1.5 ? 1 : 0
		});
		let count = 0;
		rings.forEach(({ ring, circle }, i) => {
			const seen = springs.pop(t - found[i]);
			const covered = t > popAt[i] + 0.05;
			if (t >= found[i]) count++;
			ring.style.transformOrigin = '50% 50%';
			ring.style.transform = `scale(${t < found[i] ? 0 : lerp(1.6, 1, seen)}) rotate(${t * 60}deg)`;
			ring.style.opacity = t < found[i] || covered ? '0' : '1';
			circle.setAttribute('stroke-dashoffset', `${-t * 40}`);
		});
		number.textContent = String(count);
		const counterIn = springs.snap(t - 0.65);
		css(counter, {
			transform: `translateY(${(1 - counterIn) * -40}px) scale(${lerp(0.8, 1, counterIn)})`,
			opacity: t < 0.65 ? 0 : clamp(counterIn * 2) * (1 - clamp((t - 2.6) / 0.3))
		});

		// Stickers pop on, then all hop once in a wave.
		stickers.forEach((node, i) => {
			const p = springs.pop(t - popAt[i]);
			const hop = Math.max(0, Math.sin(clamp((t - 4.6 - i * 0.06) / 0.3) * Math.PI));
			let x = 0;
			let y = -hop * 26;
			let rotate = (1 - springs.bouncy(t - popAt[i])) * -35;
			let scale = t < popAt[i] ? 0 : p;
			let opacity = 1;
			if (i === OWN) {
				const lift = progress(t, PEEL, 0.6);
				const peel = ease.inBack(lift, 2.2);
				x = peel * 260;
				y = -peel * 420 - ease.outCubic(clamp(lift * 3)) * 18;
				rotate += peel * 70 - ease.outCubic(clamp(lift * 3)) * 12;
				scale *= 1 + ease.outCubic(clamp(lift * 3)) * 0.22;
				opacity = 1 - clamp((lift - 0.7) / 0.3);
			}
			css(node, {
				transform: `translate(${x}px, ${y}px) rotate(${rotate}deg) scale(${scale})`,
				opacity
			});
		});

		// The family's own child, lit up.
		const lit = ease.outCubic(progress(t, PEEL + 0.25, 0.5));
		const spin = `${t * 160}deg`;
		halo.style.background = `conic-gradient(from ${spin}, ${[...iridescent, iridescent[0]].join(', ')})`;
		haloGlow.style.background = halo.style.background;
		halo.style.opacity = haloGlow.style.opacity = String(lit);
		const tagIn = springs.pop(t - PEEL - 0.35);
		css(tag, {
			left: `${own.x}px`,
			top: `${own.y - own.r - 96}px`,
			transformOrigin: '0% 100%',
			transform: `scale(${(t < PEEL + 0.35 ? 0 : tagIn) / S}) translateX(-50%)`
		});

		// Words.
		const kickerIn = springs.snap(t - 1.6);
		css(kicker, {
			opacity: t < 1.6 ? 0 : clamp(kickerIn * 2),
			transform: `translateX(${(1 - kickerIn) * -40}px)`
		});
		kickerFace.style.transform = `rotate(${(1 - springs.bouncy(t - 1.6)) * -180}deg)`;
		[...firstWords, ...secondWords].forEach((word, i) => {
			const p = settle(progress(t, 2.1 + i * 0.07, 0.8));
			css(word.inner, { transform: `translateY(${(1 - p) * 105}%)`, opacity: clamp(p * 2) });
		});
		captionWords.forEach((word, i) => {
			const p = settle(progress(t, PEEL + 0.6 + i * 0.05, 0.7));
			css(word.inner, { transform: `translateY(${(1 - p) * 105}%)`, opacity: clamp(p * 2) });
		});

		// The whip to the next scene.
		const pan = whip(t, 5.45, 0.8);
		scene.style.transform = `translateX(${-pan.x}px)`;
		blur(pan.speed);
	};
}
