// The notice board. Paper notices drop onto the board on the beat and get pinned, then the whole board is
// swept into a phone, the app's real board; its poll lifts off the screen, the votes fill in, and the seen
// marks tick up family by family.

import { el, css, place, words, shareGradient } from '../lib/dom.js';
import { clamp, lerp, ease, progress, springs, settle, wave } from '../lib/motion.js';
import { phone, pin, screen, colors, icon } from '../lib/kit.js';

export const linger = 0.7;

/** One notice on its paper, as the app shows it. */
function paper(note, text) {
	const node = el('div', {
		class: 'paper',
		style: { width: '420px', background: colors.papers[note.paper] }
	});
	node.innerHTML = `<div class="flow" style="font-size:20px;line-height:1.35">
<div style="display:flex;justify-content:space-between;font-weight:700"><span>${text.classroom}</span><span style="font-weight:500;color:var(--muted)">${text.author}</span></div>
<div style="margin-top:14px;font-size:31px;font-weight:700;line-height:1.15;letter-spacing:-0.01em">${note.title}</div>
<div style="margin-top:10px;font-size:23px;color:#2b2840">${note.body}</div>
</div>`;
	const head = pin(42);
	node.append(head);
	return { node, head };
}

export function mount({ root, text, lang, cue }) {
	// The title, its second line in the sunrise gradient.
	const title = el('div', {
		class: 'display',
		style: { left: '120px', top: '300px', width: '780px', fontSize: '96px', whiteSpace: 'normal' }
	});
	const first = el('div', { class: 'flow' });
	const second = el('div', { class: 'flow' });
	title.append(first, second);
	root.append(title);
	const firstWords = words(first, text.title[0]);
	const secondWords = words(second, text.title[1]);
	shareGradient(
		secondWords.map((w) => w.inner),
		second,
		'linear-gradient(120deg, #5b3fe0, #c81e6e 60%, #c2410c)'
	);
	const titleWords = [...firstWords, ...secondWords];

	// The board: four papers in a loose grid.
	const spots = [
		{ x: 1190, y: 330, r: -4 },
		{ x: 1640, y: 300, r: 3 },
		{ x: 1220, y: 720, r: 2.5 },
		{ x: 1660, y: 700, r: -3.5 }
	];
	const papers = text.notes.map((note) => {
		const p = paper(note, text);
		root.append(p.node);
		return p;
	});
	const sizes = papers.map((p) => ({ w: p.node.offsetWidth, h: p.node.offsetHeight }));

	// The phone the board goes into, with the app's own board on it.
	const device = phone(screen('parent-board', lang), 450);
	root.append(device.node);

	// The poll, lifted off the screen.
	const poll = el('div', {
		class: 'glass',
		style: {
			width: '570px',
			borderRadius: '30px',
			padding: '34px 38px',
			background: `color-mix(in srgb, ${colors.papers.yellow} 88%, white)`
		}
	});
	poll.innerHTML = `<div class="flow">
<div style="font-size:30px;font-weight:700;letter-spacing:-0.01em">${text.question}</div>
${text.options
	.map(
		(
			o,
			i
		) => `<div style="margin-top:${i ? 18 : 26}px;display:flex;justify-content:space-between;font-size:24px;font-weight:600"><span>${o.label}</span><span data-votes="${i}" style="color:var(--muted);font-weight:500">${text.count(0)}</span></div>
<div class="rel" style="margin-top:10px;height:12px;border-radius:99px;background:rgb(22 20 43 / 0.1);overflow:hidden"><div data-bar="${i}" style="position:absolute;left:0;top:0;height:12px;border-radius:99px;background:var(--accent);width:0"></div></div>`
	)
	.join('')}
<div style="margin-top:26px;display:flex;align-items:center;gap:12px;font-size:22px;font-weight:600;color:var(--muted)"><span data-eye></span><span>${text.seen}</span></div>
<div data-families style="margin-top:14px;display:flex;gap:10px"></div>
</div>`;
	root.append(poll);
	const votes = text.options.map((_, i) => poll.querySelector(`[data-votes="${i}"]`));
	const bars = text.options.map((_, i) => poll.querySelector(`[data-bar="${i}"]`));
	const eye = icon('eye', 26, { color: colors.muted, width: 2.2 });
	eye.node.style.position = 'static';
	poll.querySelector('[data-eye]').append(eye.node);
	const familyRow = poll.querySelector('[data-families]');
	const families = Array.from({ length: 8 }, (_, i) => {
		const dot = el('span', {
			style: {
				width: '34px',
				height: '34px',
				borderRadius: '50%',
				display: 'inline-block',
				background: 'rgb(22 20 43 / 0.08)',
				border: '2px solid white',
				transition: 'none'
			}
		});
		familyRow.append(dot);
		return dot;
	});
	const familyColors = ['#7c5cff', '#ff6fb1', '#4cc3ff', '#6fdcb4', '#ffb36b', '#ffc85a'];
	const total = text.options.reduce((sum, o) => sum + o.votes, 0);

	cue(0.05, 'whoosh', { length: 0.6 });
	[0.34, 0.84, 1.34, 1.84].forEach((at, i) => {
		cue(at + 0.16, 'paper', { pitch: 1 - i * 0.06 });
		cue(at + 0.28, 'pin', { pitch: 1 + i * 0.1 });
	});
	cue(2.55, 'suck', { length: 0.7 });
	cue(3.2, 'thud');
	cue(3.55, 'swish');
	cue(3.9, 'fill', { length: 0.9 });
	for (let i = 0; i < 6; i++) cue(4.5 + i * 0.09, 'tick', { pitch: 1 + i * 0.12 });

	return (t) => {
		titleWords.forEach((word, i) => {
			const p = settle(progress(t, 0.05 + i * 0.06, 0.8));
			const out = ease.inCubic(progress(t, 5.2 + i * 0.03, 0.45));
			css(word.inner, {
				transform: `translateY(${(1 - p) * 105 - out * 105}%)`,
				opacity: clamp(p * 2) * (1 - out)
			});
		});

		// Phone: rises from below as the board is swept into it.
		const rise = springs.soft(t - 2.5);
		const turn = settle(progress(t, 2.5, 1.6));
		const phoneX = 1090;
		const phoneY = 540;
		place(device.node, {
			x: phoneX - device.width / 2,
			y: phoneY - device.height / 2 + (1 - rise) * 900 + wave(t * 0.9, 5) * 6,
			perspective: 1800,
			rotateY: lerp(-38, -12, turn) + wave(t * 0.7, 2) * 2,
			rotateX: lerp(24, 4, turn),
			rotate: lerp(8, 0, turn),
			scale: 0.92
		});
		device.node.style.visibility = t > 2.45 ? 'visible' : 'hidden';
		device.shine(progress(t, 2.6, 2.4));

		// Papers: each drops on its beat, then a pin; at the sweep, they shrink into the phone in turn.
		papers.forEach((p, i) => {
			const spot = spots[i];
			const at = 0.34 + i * 0.5;
			const fall = springs.bouncy(t - at);
			const sweep = ease.inQuart(progress(t, 2.45 + i * 0.07, 0.55));
			const { w, h } = sizes[i];
			const tx = lerp(spot.x, phoneX - 40 + (i % 2) * 80, sweep);
			const ty = lerp(spot.y, phoneY - 200 + Math.floor(i / 2) * 120, sweep);
			place(p.node, {
				x: tx - w / 2,
				y: ty - h / 2 - (1 - fall) * 900,
				perspective: 1400,
				rotateX: (1 - fall) * 55,
				rotate: spot.r * (1 - sweep) + (1 - fall) * 12 * (i % 2 ? 1 : -1),
				scale: lerp(1, 0.18, sweep) * (t < at ? 0 : 1),
				opacity: 1 - clamp((sweep - 0.75) / 0.25)
			});
			const landed = springs.pop(t - at - 0.24);
			place(p.head, {
				x: w / 2 - 21,
				y: -18 - (1 - landed) * 60,
				scale: t < at + 0.24 ? 0 : lerp(2.2, 1, landed)
			});
		});

		// The poll lifts off the screen and comes forward.
		const lift = springs.snap(t - 3.5);
		const pollX = 1310;
		const pollY = 300;
		place(poll, {
			x: lerp(phoneX - 200, pollX, lift),
			y: lerp(phoneY - 100, pollY, lift),
			perspective: 1600,
			rotateY: lerp(-40, -6, lift),
			scale: lerp(0.55, 1, lift),
			opacity: t < 3.5 ? 0 : clamp((t - 3.5) * 6)
		});
		const fill = settle(progress(t, 3.9, 1.0));
		text.options.forEach((option, i) => {
			bars[i].style.width = `${((option.votes / total) * 100 * fill).toFixed(2)}%`;
			votes[i].textContent = text.count(Math.round(option.votes * fill));
		});
		eye.draw(progress(t, 4.3, 0.5));
		families.forEach((dot, i) => {
			const on = i < 6 && t > 4.5 + i * 0.09;
			const pop = on ? springs.pop(t - 4.5 - i * 0.09) : 0;
			css(dot, {
				background: on ? familyColors[i] : 'rgb(22 20 43 / 0.08)',
				transform: `scale(${on ? lerp(0.5, 1, pop) : 1})`
			});
		});

		// Everything drifts left as the next scene arrives.
		const leave = ease.inCubic(progress(t, 5.3, 0.9));
		root.style.transform = `translateX(${-leave * 160}px)`;
	};
}
