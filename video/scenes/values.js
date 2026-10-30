// The drop. Three refusals slam in on the beat, each on its own colour: no sign-ups, no ads, no tracking.
// Then, over a plane of the app's real source, free and open source; then what it's built with, small on
// purpose.

import { el, css, words, letters, shareGradient } from '../lib/dom.js';
import { clamp, lerp, ease, progress, springs, settle, random } from '../lib/motion.js';
import { icon, colors } from '../lib/kit.js';
import { ring } from '../lib/fx.js';

export const linger = 0.01;

const keywords =
	'import|from|export|const|let|var|function|return|await|async|if|else|new|type|for|of|throw|true|false|null|undefined|as';
const token = new RegExp(
	`(\\/\\/.*$|\\/\\*.*$|^\\s*\\*.*$)|('[^']*')|\\b(${keywords})\\b|\\b(\\d+)\\b`,
	'g'
);
const tones = { comment: '#8a86a3', string: '#c81e6e', keyword: '#5b3fe0', number: '#c2410c' };

/** The app's code with a little colour: comments, strings, keywords, numbers. */
function highlight(source) {
	const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
	return source
		.split('\n')
		.map((line) => {
			let out = '';
			let last = 0;
			line.replace(token, (match, comment, string, keyword, number, offset) => {
				const tone = comment ? 'comment' : string ? 'string' : keyword ? 'keyword' : 'number';
				out += escape(line.slice(last, offset));
				out += `<span style="color:${tones[tone]}${keyword ? ';font-weight:700' : ''}">${escape(match)}</span>`;
				last = offset + match.length;
				return match;
			});
			return `<div>${out}${escape(line.slice(last))}&nbsp;</div>`;
		})
		.join('');
}

export async function mount({ root, text, cue }) {
	// Part one: the refusals, each on a colour that bursts from the middle.
	const slams = el('div', { class: 'layer' });
	root.append(slams);
	const palette = [
		{ bg: colors.accent, fg: 'white' },
		{ bg: colors.blush, fg: colors.ink },
		{ bg: colors.sun, fg: colors.ink }
	];
	const fills = palette.map((p) => {
		const node = el('div', {
			style: {
				left: '960px',
				top: '540px',
				width: '10px',
				height: '10px',
				borderRadius: '50%',
				background: p.bg
			}
		});
		slams.append(node);
		return node;
	});
	const phrases = text.no.map((phrase, i) => {
		const node = el('div', {
			style: {
				left: 0,
				top: '410px',
				width: '1920px',
				textAlign: 'center',
				fontSize: '210px',
				fontWeight: 900,
				letterSpacing: '-0.045em',
				lineHeight: '1',
				color: palette[i].fg,
				whiteSpace: 'nowrap'
			}
		});
		const line = el('span', { style: { position: 'relative', display: 'inline-block' } });
		node.append(line);
		const chars = letters(line, phrase);
		slams.append(node);
		// Longer words, as in Croatian, shrink to stay inside the frame.
		if (line.offsetWidth > 1760) node.style.fontSize = `${(210 * 1760) / line.offsetWidth}px`;
		return { node, chars };
	});
	const shock = ring(1300);
	slams.append(shock.node);
	const SLAM = [0, 1, 2];

	// Part two: free and open source, over the code.
	const light = el('div', {
		class: 'layer',
		style: {
			background: `radial-gradient(50rem 40rem at 90% 0%, rgb(255 138 101 / 0.45), transparent 70%),
radial-gradient(50rem 40rem at 0% 50%, rgb(124 92 255 / 0.3), transparent 70%),
radial-gradient(50rem 40rem at 70% 100%, rgb(76 195 255 / 0.35), transparent 70%), ${colors.canvas}`
		}
	});
	root.append(light);
	const source = await fetch('/src/lib/crypto.ts').then((r) => r.text());
	// A floor of code running away from the camera, its far end high in the frame.
	const plane = el('div', {
		style: {
			left: '-40px',
			top: '-1120px',
			width: '2000px',
			height: '2400px',
			overflow: 'hidden',
			transformOrigin: '50% 100%',
			transform: 'rotateZ(-7deg) rotateX(60deg)'
		}
	});
	const code = el('div', {
		class: 'mono flow',
		style: {
			padding: '600px 0 0 100px',
			width: '1900px',
			fontSize: '30px',
			lineHeight: '46px',
			color: 'rgb(22 20 43 / 0.7)',
			whiteSpace: 'pre'
		}
	});
	code.innerHTML = highlight(source.split('\n').slice(0, 150).join('\n'));
	plane.append(code);
	const planeHolder = el('div', {
		class: 'layer',
		style: {
			perspective: '900px',
			perspectiveOrigin: '960px 0px',
			mask: 'linear-gradient(180deg, transparent 4%, #000 32%, #000 82%, transparent)',
			webkitMask: 'linear-gradient(180deg, transparent 4%, #000 32%, #000 82%, transparent)'
		}
	});
	planeHolder.append(plane);
	light.append(planeHolder);
	const veil = el('div', {
		class: 'layer',
		style: {
			background:
				'radial-gradient(42rem 22rem at 50% 46%, rgb(250 247 255 / 0.9), rgb(250 247 255 / 0.55) 55%, transparent)'
		}
	});
	light.append(veil);

	const freeLine = el('div', {
		class: 'display',
		style: {
			left: 0,
			top: '250px',
			width: '1920px',
			textAlign: 'center',
			fontSize: '220px',
			letterSpacing: '-0.035em'
		}
	});
	const freeWords = words(freeLine, text.free[0]);
	const openLine = el('div', {
		class: 'display',
		style: {
			left: 0,
			top: '480px',
			width: '1920px',
			textAlign: 'center',
			fontSize: '220px',
			letterSpacing: '-0.035em'
		}
	});
	const openSpan = el('span', { style: { position: 'relative' } });
	openLine.append(openSpan);
	const openWords = words(openSpan, text.free[1]);
	light.append(freeLine, openLine);
	shareGradient(
		openWords.map((w) => w.inner),
		openSpan,
		'linear-gradient(120deg, #5b3fe0, #c81e6e 60%, #c2410c)'
	);
	const repo = el('div', {
		style: {
			left: '0',
			top: '820px',
			width: '1920px',
			display: 'flex',
			justifyContent: 'center',
			gap: '20px'
		}
	});
	const pill = (content, dark) => {
		const node = el('div', {
			style: {
				position: 'static',
				height: '88px',
				padding: '0 38px',
				borderRadius: '44px',
				display: 'flex',
				alignItems: 'center',
				gap: '16px',
				fontSize: '36px',
				fontWeight: 700,
				background: dark ? colors.ink : 'white',
				color: dark ? 'white' : colors.ink,
				boxShadow: '0 20px 40px -20px rgb(46 32 120 / 0.45)',
				whiteSpace: 'nowrap'
			}
		});
		node.append(...content);
		repo.append(node);
		return node;
	};
	const github = icon('github', 40, { color: 'white', width: 2 });
	github.node.style.position = 'static';
	const repoPill = pill(
		[github.node, el('span', { style: { position: 'static' } }, 'Commit-HQ/BubbleBoard')],
		true
	);
	const licensePill = pill([el('span', { style: { position: 'static' } }, 'GNU AGPL v3')], false);
	light.append(repo);

	// Part three: what it's built with, in two rows drifting opposite ways, and why so little.
	const stack = el('div', { class: 'layer' });
	light.append(stack);
	const half = Math.ceil(text.stack.length / 2);
	const lanes = [text.stack.slice(0, half), text.stack.slice(half)].map((names, lane) => {
		const row = el('div', {
			style: {
				left: 0,
				top: lane ? '470px' : '330px',
				display: 'flex',
				gap: '22px',
				whiteSpace: 'nowrap'
			}
		});
		const items = [...names, ...names, ...names].map((name, i) => {
			const node = el('div', {
				style: {
					position: 'static',
					height: '104px',
					padding: '0 46px',
					borderRadius: '52px',
					display: 'flex',
					alignItems: 'center',
					flexShrink: '0',
					whiteSpace: 'nowrap',
					fontSize: '50px',
					fontWeight: 750,
					letterSpacing: '-0.02em',
					background: (i + lane) % 2 ? colors.ink : 'white',
					color: (i + lane) % 2 ? 'white' : colors.ink,
					boxShadow: '0 24px 50px -26px rgb(46 32 120 / 0.5)'
				}
			});
			node.textContent = name;
			row.append(node);
			return node;
		});
		stack.append(row);
		return { row, items, width: row.scrollWidth / 3 };
	});
	const small = el('div', {
		class: 'display',
		style: { left: 0, top: '680px', width: '1920px', textAlign: 'center', fontSize: '112px' }
	});
	const smallWords = words(small, text.small);
	stack.append(small);

	SLAM.forEach((at, i) => {
		cue(at, 'stamp', { pitch: 1 - i * 0.06 });
	});
	cue(2.75, 'whoosh', { length: 0.5 });
	cue(3.0, 'impact', { soft: true });
	cue(3.75, 'stamp', { pitch: 1.15, soft: true });
	cue(4.4, 'blip', { count: 2, spacing: 0.12, pitch: 1.5 });
	cue(5.35, 'whoosh', { length: 0.6 });
	cue(5.5, 'swish');
	cue(6.0, 'shimmer');
	cue(7.4, 'suck', { length: 0.6 });

	const rand = random(9);
	const shakes = SLAM.map(() => [rand.range(-1, 1), rand.range(-1, 1)]);

	return (t) => {
		// The refusals.
		let shakeX = 0;
		let shakeY = 0;
		phrases.forEach((phrase, i) => {
			const at = SLAM[i];
			const next = SLAM[i + 1] ?? 2.86;
			const on = t >= at && t < next;
			phrase.node.style.visibility = on ? 'visible' : 'hidden';
			const burst = ease.outCubic(progress(t, at - 0.06, 0.32));
			css(fills[i], {
				transform: `translate(-50%, -50%) scale(${burst * 240})`,
				visibility: t >= at - 0.06 && t < 3.1 ? 'visible' : 'hidden'
			});
			phrase.chars.forEach((ch, k) => {
				const p = clamp((t - at - k * 0.014) / 0.16);
				const leave = i < SLAM.length - 1 ? 0 : ease.inCubic(progress(t, 2.62, 0.24));
				css(ch, {
					transform: `scale(${lerp(2.6, 1, ease.outQuart(p)) * lerp(1, 1.5, leave)})`,
					opacity: clamp(p * 4) * (1 - leave),
					filter: p < 1 ? `blur(${(1 - p) * 10}px)` : 'none'
				});
			});
			const kick = Math.exp(-Math.max(0, t - at - 0.12) * 14) * (t > at + 0.1 ? 1 : 0);
			shakeX += shakes[i][0] * 18 * kick * Math.sin((t - at) * 70);
			shakeY += shakes[i][1] * 18 * kick * Math.cos((t - at) * 63);
		});
		slams.style.transform = `translate(${shakeX}px, ${shakeY}px)`;
		const lastAt = SLAM[SLAM.length - 1];
		shock.set(960, 540, (t - lastAt - 0.1) / 0.8, 300, 22);

		// The light comes back as a circle at the third beat's end.
		const open = ease.inOutCubic(progress(t, 2.78, 0.4));
		light.style.clipPath = open < 1 ? `circle(${open * 1200}px at 960px 540px)` : 'none';
		light.style.visibility = t >= 2.78 ? 'visible' : 'hidden';
		slams.style.visibility = t < 3.2 ? 'visible' : 'hidden';

		const drift = t - 2.8;
		code.style.transform = `translateY(${-drift * 110}px)`;
		freeWords.forEach((word) => {
			const p = springs.snap(t - 3.0);
			const out = ease.inCubic(progress(t, 5.3, 0.35));
			css(word.inner, {
				transform: `translateY(${(1 - p) * 105 - out * 110}%) scale(${lerp(1.25, 1, clamp(p))})`,
				opacity: clamp(p * 3) * (1 - out)
			});
		});
		openWords.forEach((word, i) => {
			const p = springs.snap(t - 3.75 - i * 0.08);
			const out = ease.inCubic(progress(t, 5.32 + i * 0.03, 0.35));
			css(word.inner, {
				transform: `translateY(${(1 - p) * 105 - out * 110}%) scale(${lerp(1.25, 1, clamp(p))})`,
				opacity: clamp(p * 3) * (1 - out)
			});
		});
		[repoPill, licensePill].forEach((node, i) => {
			const p = springs.pop(t - 4.4 - i * 0.12);
			const out = ease.inBack(progress(t, 5.3, 0.3));
			css(node, {
				transform: `scale(${t < 4.4 + i * 0.12 ? 0 : p * (1 - out)})`
			});
		});
		github.draw(progress(t, 4.45, 0.5));

		// The stack.
		lanes.forEach((lane, i) => {
			const dir = i ? 1 : -1;
			const enter = ease.outExpo(progress(t, 5.45 + i * 0.08, 1.0));
			const cruise = (t - 5.45) * 60 * dir;
			const x = (1 - enter) * 1600 * -dir + cruise - lane.width + (i ? -200 : 0);
			css(lane.row, {
				transform: `translateX(${x}px)`,
				visibility: t > 5.4 ? 'visible' : 'hidden'
			});
		});
		smallWords.forEach((word, i) => {
			const p = settle(progress(t, 6.0 + i * 0.07, 0.8));
			css(word.inner, { transform: `translateY(${(1 - p) * 105}%)`, opacity: clamp(p * 2) });
		});
		const away = ease.inCubic(progress(t, 7.45, 0.55));
		css(stack, {
			transformOrigin: '960px 540px',
			transform: `scale(${1 + away * 0.5})`,
			opacity: 1 - away,
			filter: away > 0.02 ? `blur(${away * 14}px)` : 'none'
		});
		planeHolder.style.opacity = String(1 - away);
	};
}
