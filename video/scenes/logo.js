// The logo. Out of the pop, bubbles scatter and three of them settle into the app icon's white dots while its
// sunrise square swells behind them; the icon slides aside for the wordmark, the tagline rises, a glint runs
// over it all, and the camera dives into the big white dot to reach the next scene.

import { el, css, place, words, shareGradient } from '../lib/dom.js';
import { clamp, lerp, ease, progress, springs, settle, glide, wave } from '../lib/motion.js';
import { appIcon, iconBubbles, colors } from '../lib/kit.js';
import { air } from '../lib/fx.js';

export const linger = 0.5;
export const z = 25;

export function mount({ root, text, cue }) {
	const haze = air(30, 21, { burst: { t: 0, x: 960, y: 540 }, sizes: [16, 180] });
	root.append(haze.layer);

	const group = el('div', { class: 'layer' });
	root.append(group);

	// The wordmark, measured to centre the lockup.
	const wordmark = el('div', {
		style: {
			fontSize: '172px',
			fontWeight: 800,
			letterSpacing: '-0.035em',
			lineHeight: '1',
			whiteSpace: 'nowrap',
			color: colors.ink
		}
	});
	const marks = words(wordmark, 'BubbleBoard', { chars: true })[0];
	css(marks.mask, { padding: '0.15em 0.08em 0.25em', margin: '-0.15em -0.08em -0.25em' });
	group.append(wordmark);
	const shine = el('div', {
		style: {
			fontSize: '172px',
			fontWeight: 800,
			letterSpacing: '-0.035em',
			lineHeight: '1',
			whiteSpace: 'nowrap',
			color: 'transparent',
			backgroundImage:
				'linear-gradient(100deg, transparent 42%, rgb(255 255 255 / 0.95) 50%, transparent 58%)',
			backgroundSize: '300% 100%',
			backgroundClip: 'text',
			webkitBackgroundClip: 'text'
		}
	});
	shine.textContent = 'BubbleBoard';
	group.append(shine);

	const S = 210;
	const BIG = 460;
	const gap = 60;
	const wordWidth = wordmark.offsetWidth;
	const wordHeight = wordmark.offsetHeight;
	const lockup = S + gap + wordWidth;
	const left = (1920 - lockup) / 2;
	const cy = 452;
	const iconFinal = { x: left + S / 2, y: cy };
	css(wordmark, { left: `${left + S + gap}px`, top: `${cy - wordHeight / 2 - 6}px` });
	css(shine, { left: `${left + S + gap}px`, top: `${cy - wordHeight / 2 - 6}px` });

	// The icon, built at its big size and scaled down as a whole later.
	const icon = appIcon(BIG);
	group.append(icon.node);
	const sheen = el('div', {
		style: {
			inset: '0',
			width: `${BIG}px`,
			height: `${BIG}px`,
			background:
				'linear-gradient(115deg, transparent 35%, rgb(255 255 255 / 0.55) 48%, transparent 60%)',
			backgroundSize: '300% 100%',
			mixBlendMode: 'soft-light'
		}
	});
	icon.tile.style.overflow = 'hidden';
	icon.tile.append(sheen);

	// The tagline, with its accent in the sunrise gradient.
	const tagline = el('div', {
		class: 'display',
		style: { fontSize: '100px', left: '0', width: '1920px', textAlign: 'center', top: '640px' }
	});
	const plain = el('span');
	const accent = el('span');
	tagline.append(plain, ' ', accent);
	group.append(tagline);
	const plainWords = words(plain, text.tagline);
	const accentWords = words(accent, text.accent);
	shareGradient(
		accentWords.map((w) => w.inner),
		accent,
		'linear-gradient(120deg, #5b3fe0, #c81e6e 60%, #c2410c)'
	);
	const taglineWords = [...plainWords, ...accentWords];

	// The white dot the camera dives into, and the white it fills the frame with.
	const dive = el('div', { style: { borderRadius: '50%', background: 'white' } });
	root.append(dive);

	cue(0.125, 'pop', { pitch: 1 });
	cue(0.25, 'pop', { pitch: 1.335 });
	cue(0.375, 'pop', { pitch: 1.5 });
	cue(1.4, 'whoosh', { length: 0.8 });
	cue(1.75, 'blip', { count: 11, spacing: 0.04, pitch: 1.4 });
	cue(2.6, 'shimmer');
	cue(4.0, 'sparkle');
	cue(6.6, 'suck', { length: 1.3 });

	return (t) => {
		haze.update(t);

		// The square swells as a circle, then squares up; the dots pop in, big to small.
		const swell = springs.snap(t - 0.02);
		const squareUp = settle(progress(t, 0.3, 0.6));
		css(icon.tile, {
			transform: `scale(${swell}) rotate(${lerp(-14, 0, springs.soft(t))}deg)`,
			borderRadius: `${lerp(BIG / 2, (BIG * 20) / 64, squareUp)}px`
		});
		icon.dots.forEach((dot, i) => {
			const at = [0.125, 0.25, 0.375][i];
			const p = springs.pop(t - at);
			const b = iconBubbles[i];
			// Each dot arrives from the burst, a little off its place.
			const from = [
				[-120, 90],
				[140, -110],
				[130, 120]
			][i];
			css(dot, {
				transform: `translate(${from[0] * (1 - p)}px, ${from[1] * (1 - p)}px) scale(${t < at ? 0 : p})`,
				opacity: t < at ? 0 : b.opacity
			});
		});
		sheen.style.backgroundPosition = `${lerp(130, -40, ease.inOutCubic(progress(t, 3.9, 0.9)))}% 0`;

		// Then the icon makes room for the wordmark.
		const slide = glide(progress(t, 1.35, 0.9));
		const scale = lerp(1, S / BIG, slide);
		const x = lerp(960, iconFinal.x, slide);
		const y = lerp(540, iconFinal.y, slide) + wave(t * 0.8, 2) * 4 * slide;
		place(icon.node, { x: x - BIG / 2, y: y - BIG / 2, scale });

		marks.chars.forEach((ch, i) => {
			const p = settle(progress(t, 1.7 + i * 0.04, 0.6));
			css(ch, {
				transform: `translateY(${(1 - p) * 110}%) rotate(${(1 - p) * 12}deg)`,
				opacity: clamp(p * 3)
			});
		});
		shine.style.backgroundPosition = `${lerp(120, -20, ease.inOutCubic(progress(t, 4.1, 1.1)))}% 0`;
		shine.style.opacity = t > 4 && t < 5.4 ? '1' : '0';

		taglineWords.forEach((word, i) => {
			const p = settle(progress(t, 2.55 + i * 0.09, 0.8));
			css(word.inner, { transform: `translateY(${(1 - p) * 105}%)`, opacity: clamp(p * 2) });
		});

		// The dive: everything else leans back while the big dot grows past the edges of the frame.
		const lean = ease.inCubic(progress(t, 6.6, 1.0));
		css(group, {
			transformOrigin: `${iconFinal.x}px ${iconFinal.y}px`,
			// A slow push in while the lockup holds, so the frame never quite stands still.
			transform: `scale(${(1 + ease.inOutSine(progress(t, 2.4, 4.4)) * 0.05) * (1 + lean * 1.4)})`,
			opacity: String(1 - clamp((t - 7.2) / 0.4)),
			filter: lean > 0.02 ? `blur(${lean * 6}px)` : 'none'
		});
		const dot = iconBubbles[0];
		const dotX = iconFinal.x - S / 2 + (dot.x / 64) * S;
		const dotY = iconFinal.y - S / 2 + (dot.y / 64) * S;
		const radius = (dot.r / 64) * S;
		const grow = ease.inQuart(progress(t, 6.7, 0.95));
		const cover = radius + grow * 2100;
		const reveal = ease.outCubic(progress(t, 7.85, 0.6));
		css(dive, {
			left: `${dotX - cover}px`,
			top: `${dotY - cover}px`,
			width: `${cover * 2}px`,
			height: `${cover * 2}px`,
			opacity: t < 6.7 ? 0 : 1 - reveal,
			display: t < 6.7 ? 'none' : 'block'
		});
	};
}
