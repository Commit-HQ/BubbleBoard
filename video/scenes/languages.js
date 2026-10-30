// Croatian and English. The dark of the last scene turns over tile by tile into the light, and a split-flap
// board clatters through its letters to the tagline in one language, then the other, the reel's own
// language last. Then the letters drop off the board.

import { el, css, place, words } from '../lib/dom.js';
import { clamp, ease, progress, settle, random } from '../lib/motion.js';
import { colors } from '../lib/kit.js';

export const lead = 0.6;
export const linger = 0.01;

const COLS = 16;
const FLIP = 0.075;
const shuffle = 'ABCDEFGHIJKLMNOPRSTUVZŠĐČĆŽ0123456789';

/** Splits a line into rows of at most `cols` characters at spaces, each centred. */
function rows(line, count = 2, cols = COLS) {
	const out = [''];
	for (const word of line.toUpperCase().split(' ')) {
		const row = out[out.length - 1];
		if (!row) out[out.length - 1] = word;
		else if (row.length + 1 + word.length <= cols) out[out.length - 1] = `${row} ${word}`;
		else out.push(word);
	}
	while (out.length < count) out.push('');
	return out.map((row) => {
		const pad = Math.floor((cols - row.length) / 2);
		return (' '.repeat(pad) + row).padEnd(cols, ' ');
	});
}

/** One split-flap cell: two still halves, and two flaps that turn between them. */
function cell(w, h) {
	const node = el('div', { style: { width: `${w}px`, height: `${h}px` } });
	const half = (top, flap) => {
		const box = el('div', {
			style: {
				left: 0,
				top: top ? '0' : `${h / 2}px`,
				width: `${w}px`,
				height: `${h / 2}px`,
				overflow: 'hidden',
				borderRadius: top ? '12px 12px 0 0' : '0 0 12px 12px',
				background: top ? '#25223f' : '#1c1a33',
				transformOrigin: top ? '50% 100%' : '50% 0%',
				backfaceVisibility: 'hidden',
				boxShadow: flap
					? 'none'
					: top
						? 'inset 0 2px 0 rgb(255 255 255 / 0.08)'
						: '0 14px 24px -12px rgb(22 20 43 / 0.5)'
			}
		});
		const glyph = el('div', {
			style: {
				left: 0,
				top: top ? '0' : `${-h / 2}px`,
				width: `${w}px`,
				height: `${h}px`,
				lineHeight: `${h}px`,
				textAlign: 'center',
				fontSize: `${h * 0.72}px`,
				fontWeight: 750,
				color: colors.canvas
			}
		});
		box.append(glyph);
		node.append(box);
		return { box, glyph };
	};
	const parts = {
		top: half(true, false),
		bottom: half(false, false),
		flapTop: half(true, true),
		flapBottom: half(false, true)
	};
	const hinge = el('div', {
		style: {
			left: 0,
			top: `${h / 2 - 1}px`,
			width: `${w}px`,
			height: '2px',
			background: 'rgb(0 0 0 / 0.55)'
		}
	});
	node.append(hinge);
	return { node, ...parts };
}

export function mount({ root, text, cue }) {
	root.style.background = `radial-gradient(50rem 40rem at 90% 0%, rgb(255 138 101 / 0.4), transparent 70%),
radial-gradient(50rem 40rem at 0% 40%, rgb(124 92 255 / 0.28), transparent 70%),
radial-gradient(50rem 40rem at 75% 100%, rgb(76 195 255 / 0.32), transparent 70%), ${colors.canvas}`;

	const W = 88;
	const H = 128;
	const gap = 10;
	const left = (1920 - (COLS * (W + gap) - gap)) / 2;
	const tops = [330, 330 + H + 14];
	const [first, second] = text.lines.map((line) => rows(line));

	const board = el('div', { class: 'layer' });
	root.append(board);
	const rand = random(5);
	const cells = [];
	for (let r = 0; r < 2; r++) {
		for (let c = 0; c < COLS; c++) {
			const flap = cell(W, H);
			place(flap.node, { x: left + c * (W + gap), y: tops[r] });
			board.append(flap.node);
			// When this cell changes, and to what: a few random letters before each word lands.
			const events = [];
			const run = (start, target) => {
				const extra = target === ' ' ? 1 + Math.floor(rand() * 2) : 3 + Math.floor(rand() * 6);
				for (let k = 0; k < extra; k++)
					events.push({ t: start + k * FLIP, ch: rand.pick([...shuffle]) });
				events.push({ t: start + extra * FLIP, ch: target });
			};
			run(0.1 + c * 0.03 + r * 0.06, first[r][c]);
			run(1.95 + c * 0.03 + r * 0.06, second[r][c]);
			cells.push({ ...flap, events, r, c, spin: rand.range(-40, 40), drift: rand.range(-60, 60) });
		}
	}

	// The language code over the board, flipping with it.
	const codes = text.lines.map((line) => (/[čćđšž]|bliže/i.test(line) ? 'HR' : 'EN'));
	const tags = [0, 1].map((k) => {
		const flap = cell(54, 76);
		place(flap.node, { x: 960 - 58 + k * 62, y: 210 });
		board.append(flap.node);
		return flap;
	});

	const caption = el('div', {
		class: 'display',
		style: { left: 0, width: '1920px', top: '660px', textAlign: 'center', fontSize: '76px' }
	});
	const captionWords = words(caption, text.label);
	root.append(caption);

	// The tiles the dark turns over on.
	const tiles = el('div', { class: 'layer' });
	root.append(tiles);
	const darkBackground = `radial-gradient(60rem 30rem at 50% 60%, rgb(111 220 180 / 0.12), transparent 70%),
radial-gradient(50rem 40rem at 50% 0%, rgb(124 92 255 / 0.28), transparent 70%), ${colors.ink}`;
	const tileList = [];
	for (let y = 0; y < 9; y++) {
		for (let x = 0; x < 16; x++) {
			const tile = el('div', {
				style: {
					left: `${x * 120}px`,
					top: `${y * 120}px`,
					width: '121px',
					height: '121px',
					background: darkBackground,
					backgroundSize: '1920px 1080px',
					backgroundPosition: `${-x * 120}px ${-y * 120}px`
				}
			});
			tiles.append(tile);
			tileList.push({ tile, delay: (x + y) * 0.024 });
		}
	}

	cue(-0.6, 'flapwave', { length: 0.8 });
	cue(0.1, 'flap', { length: 1.25 });
	cue(1.95, 'flap', { length: 1.25 });
	cue(3.45, 'whoosh', { length: 0.5 });
	cue(3.5, 'riser', { length: 0.5 });

	const show = (part, ch) => {
		if (part.glyph.textContent !== ch) part.glyph.textContent = ch;
	};
	const flipCell = (flap, events, t) => {
		let j = -1;
		for (let k = 0; k < events.length; k++) if (events[k].t <= t) j = k;
		const cur = j >= 0 ? events[j].ch : ' ';
		const prev = j > 0 ? events[j - 1].ch : ' ';
		const p = j >= 0 ? clamp((t - events[j].t) / FLIP) : 1;
		show(flap.top, cur);
		show(flap.bottom, p < 1 ? prev : cur);
		if (p < 0.5) {
			show(flap.flapTop, prev);
			flap.flapTop.box.style.visibility = p < 1 && j >= 0 ? 'visible' : 'hidden';
			flap.flapTop.box.style.transform = `perspective(600px) rotateX(${-180 * p}deg)`;
			flap.flapTop.box.style.filter = `brightness(${1 - p * 0.8})`;
			flap.flapBottom.box.style.visibility = 'hidden';
		} else {
			flap.flapTop.box.style.visibility = 'hidden';
			show(flap.flapBottom, cur);
			flap.flapBottom.box.style.visibility = p < 1 ? 'visible' : 'hidden';
			flap.flapBottom.box.style.transform = `perspective(600px) rotateX(${180 * (1 - p)}deg)`;
			flap.flapBottom.box.style.filter = `brightness(${0.6 + (p - 0.5) * 0.8})`;
		}
	};
	const tagEvents = [0, 1].map((k) => [
		{ t: 0.1 + k * 0.04, ch: rand.pick([...shuffle]) },
		{ t: 0.1 + k * 0.04 + FLIP, ch: codes[0][k] },
		{ t: 1.95 + k * 0.04, ch: rand.pick([...shuffle]) },
		{ t: 1.95 + k * 0.04 + FLIP, ch: codes[1][k] }
	]);

	return (t) => {
		tileList.forEach(({ tile, delay }) => {
			const p = ease.inOutCubic(progress(t, -0.6 + delay, 0.32));
			tile.style.transform = `perspective(900px) rotateX(${p * 90}deg)`;
			tile.style.visibility = p >= 1 ? 'hidden' : 'visible';
			tile.style.filter = `brightness(${1 + p * 0.6})`;
		});

		cells.forEach((flap) => {
			flipCell(flap, flap.events, t);
			const fall = t - (3.45 + flap.c * 0.014 + flap.r * 0.04);
			if (fall > 0) {
				place(flap.node, {
					x: left + flap.c * (W + gap) + flap.drift * fall,
					y: tops[flap.r] - 120 * fall + 2600 * fall * fall,
					rotate: flap.spin * fall * 3
				});
			} else place(flap.node, { x: left + flap.c * (W + gap), y: tops[flap.r] });
		});
		tags.forEach((flap, k) => {
			flipCell(flap, tagEvents[k], t);
			const fall = t - 3.42;
			place(flap.node, {
				x: 960 - 58 + k * 62,
				y: 210 + (fall > 0 ? -100 * fall + 2600 * fall * fall : 0),
				rotate: fall > 0 ? (k ? 30 : -30) * fall * 3 : 0
			});
		});

		captionWords.forEach((word, i) => {
			const p = settle(progress(t, 0.6 + i * 0.07, 0.8));
			const out = ease.inCubic(progress(t, 3.4, 0.35));
			css(word.inner, {
				transform: `translateY(${(1 - p) * 105 + out * 105}%)`,
				opacity: clamp(p * 2) * (1 - out)
			});
		});
	};
}
