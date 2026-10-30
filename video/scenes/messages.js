// Private questions. A parent types a question to the teacher, sends it up into a quiet conversation of
// their own, the teacher types back, and the parent says thanks. Then the conversation turns over like a
// card to show the meetings on its back.

import { el, css, place, words } from '../lib/dom.js';
import { clamp, lerp, ease, progress, springs, settle, spring } from '../lib/motion.js';
import { icon, colors } from '../lib/kit.js';
import { whip, motionBlur } from '../lib/fx.js';

export const lead = 0.55;
export const linger = 0.01;

// The conversation panel, shared in size and place with the meetings, which sit on its back.
export const panel = { x: 1010, y: 120, w: 780, h: 840 };

export function mount({ root, text, copy, cue }) {
	const scene = el('div', { class: 'layer' });
	root.append(scene);
	const blur = motionBlur(scene);

	const title = el('div', {
		class: 'display',
		style: { left: '120px', top: '330px', fontSize: '116px', width: '820px', whiteSpace: 'normal' }
	});
	const titleWords = words(title, text.title);
	const sub = el('div', {
		style: {
			left: '124px',
			top: `${330 + title.offsetHeight + 30}px`,
			fontSize: '44px',
			fontWeight: 500,
			color: colors.muted,
			whiteSpace: 'nowrap'
		}
	});
	const subWords = words(sub, text.sub);
	scene.append(title, sub);
	css(sub, { top: `${330 + title.offsetHeight + 30}px` });

	// The panel, its header, and its input.
	const card = el('div', {
		class: 'glass',
		style: {
			left: `${panel.x}px`,
			top: `${panel.y}px`,
			width: `${panel.w}px`,
			height: `${panel.h}px`,
			borderRadius: '48px',
			background: 'rgb(255 255 255 / 0.62)',
			overflow: 'hidden',
			backfaceVisibility: 'hidden'
		}
	});
	scene.append(card);
	const avatar = el('div', {
		style: {
			left: '40px',
			top: '36px',
			width: '84px',
			height: '84px',
			borderRadius: '50%',
			background: 'var(--sunrise)',
			color: 'white',
			display: 'grid',
			placeItems: 'center',
			fontSize: '32px',
			fontWeight: 800
		}
	});
	avatar.textContent = text.initials;
	const who = el('div', {
		style: { left: '146px', top: '40px', fontSize: '34px', fontWeight: 750 }
	});
	who.textContent = text.teacher;
	const where = el('div', {
		style: { left: '146px', top: '84px', fontSize: '26px', fontWeight: 500, color: colors.muted }
	});
	where.textContent = copy.board.classroom;
	const privacy = el('div', {
		style: {
			right: '36px',
			top: '50px',
			height: '56px',
			padding: '0 24px 0 18px',
			borderRadius: '28px',
			background: colors.ink,
			color: 'white',
			display: 'flex',
			alignItems: 'center',
			gap: '10px',
			fontSize: '24px',
			fontWeight: 650,
			whiteSpace: 'nowrap'
		}
	});
	const lock = icon('lock', 26, { color: 'white', width: 2.4 });
	lock.node.style.position = 'static';
	const privacyText = el('span', { style: { position: 'static' } });
	privacyText.textContent = text.private;
	privacy.append(lock.node, privacyText);
	const rule = el('div', {
		style: {
			left: '0',
			top: '150px',
			width: `${panel.w}px`,
			height: '2px',
			background: 'rgb(22 20 43 / 0.06)'
		}
	});
	card.append(avatar, who, where, privacy, rule);

	const input = el('div', {
		style: {
			left: '30px',
			top: `${panel.h - 126}px`,
			width: `${panel.w - 60}px`,
			height: '96px',
			borderRadius: '48px',
			background: 'rgb(255 255 255 / 0.85)',
			boxShadow: 'inset 0 0 0 2px rgb(22 20 43 / 0.06)'
		}
	});
	const typed = el('div', {
		style: {
			left: '36px',
			top: '29px',
			fontSize: '30px',
			fontWeight: 500,
			whiteSpace: 'nowrap',
			color: colors.ink,
			width: `${panel.w - 230}px`,
			overflow: 'hidden'
		}
	});
	const send = el('div', {
		style: {
			right: '14px',
			top: '14px',
			width: '68px',
			height: '68px',
			borderRadius: '50%',
			background: colors.accent
		}
	});
	const arrow = icon('arrowUp', 34, { color: 'white', width: 2.8 });
	place(arrow.node, { x: 17, y: 17 });
	send.append(arrow.node);
	input.append(typed, send);
	card.append(input);

	// The messages, measured, then stacked from the input up as they arrive.
	const thread = text.thread.map((message) => {
		const mine = message.from === 'parent';
		const bubble = el('div', {
			style: {
				maxWidth: '580px',
				padding: mine ? '24px 30px' : '20px 30px 24px',
				borderRadius: mine ? '34px 34px 10px 34px' : '34px 34px 34px 10px',
				background: mine ? colors.ink : 'white',
				color: mine ? 'white' : colors.ink,
				fontSize: '34px',
				fontWeight: 500,
				lineHeight: '1.32',
				boxShadow: mine
					? '0 20px 40px -20px rgb(22 20 43 / 0.5)'
					: '0 20px 40px -24px rgb(46 32 120 / 0.35)'
			}
		});
		if (!mine) {
			const name = el('div', {
				class: 'flow',
				style: { fontSize: '23px', fontWeight: 750, color: colors.accent, marginBottom: '6px' }
			});
			name.textContent = text.teacher;
			bubble.append(name);
		}
		const body = el('div', { class: 'flow' });
		body.textContent = message.text;
		bubble.append(body);
		card.append(bubble);
		return { mine, bubble, w: bubble.offsetWidth, h: bubble.offsetHeight, text: message.text };
	});
	const typingBubble = el('div', {
		style: {
			left: '36px',
			width: '128px',
			height: '70px',
			borderRadius: '34px 34px 34px 10px',
			background: 'white',
			boxShadow: '0 20px 40px -24px rgb(46 32 120 / 0.35)'
		}
	});
	const dots = [0, 1, 2].map((i) => {
		const dot = el('div', {
			style: {
				left: `${30 + i * 26}px`,
				top: '27px',
				width: '16px',
				height: '16px',
				borderRadius: '50%',
				background: colors.muted
			}
		});
		typingBubble.append(dot);
		return dot;
	});
	card.append(typingBubble);

	const arrive = [1.0, 2.0, 3.0];
	const typing = [[0.15, 0.95], null, [2.55, 2.95]];
	const bottom = panel.h - 150;
	const gap = 22;
	const stackY = (j, n) => {
		let y = bottom;
		for (let k = n - 1; k >= j; k--) y -= thread[k].h + (k === n - 1 ? 0 : gap);
		return y;
	};

	cue(-0.55, 'whip', { length: 0.8 });
	cue(0.15, 'type', { length: 0.8 });
	cue(1.0, 'send');
	cue(1.45, 'bloop', { pitch: 0.8 });
	cue(2.0, 'receive');
	cue(2.55, 'type', { length: 0.4 });
	cue(3.0, 'send');
	cue(3.55, 'flip');

	return (t) => {
		const pan = whip(t, -0.55, 0.8);
		scene.style.transform = `translateX(${1920 - pan.x}px)`;
		blur(pan.speed);

		titleWords.forEach((word, i) => {
			const p = settle(progress(t, 0.05 + i * 0.07, 0.8));
			const out = ease.inCubic(progress(t, 3.45 + i * 0.03, 0.4));
			css(word.inner, {
				transform: `translateY(${(1 - p) * 105 - out * 105}%)`,
				opacity: clamp(p * 2) * (1 - out)
			});
		});
		subWords.forEach((word, i) => {
			const p = settle(progress(t, 0.45 + i * 0.05, 0.7));
			const out = ease.inCubic(progress(t, 3.5, 0.35));
			css(word.inner, {
				transform: `translateY(${(1 - p) * 105 - out * 105}%)`,
				opacity: clamp(p * 2) * (1 - out)
			});
		});

		// What's being typed in the input, and the send button's nudge.
		let shown = '';
		typing.forEach((range, i) => {
			if (!range) return;
			const [a, b] = range;
			if (t >= a && t < arrive[i]) {
				const chars = Math.round(thread[i].text.length * clamp((t - a) / (b - a)));
				shown = thread[i].text.slice(0, chars);
			}
		});
		const caret = Math.floor(t * 3) % 2 === 0 ? '|' : ' ';
		typed.textContent = shown ? shown + caret : text.placeholder;
		typed.style.color = shown ? colors.ink : 'rgb(87 84 110 / 0.7)';
		if (typed.scrollWidth > typed.clientWidth) typed.scrollLeft = typed.scrollWidth;
		const nudge = Math.max(
			...arrive.map((a, i) => (thread[i].mine ? Math.sin(clamp((t - a) / 0.25) * Math.PI) : 0))
		);
		send.style.transform = `scale(${1 + nudge * 0.18})`;

		// The thread.
		const n = arrive.filter((a) => t >= a).length;
		thread.forEach((m, j) => {
			if (j >= n) {
				m.bubble.style.opacity = '0';
				return;
			}
			const since = t - arrive[n - 1];
			const before = j < n - 1 ? stackY(j, n - 1) : null;
			const target = stackY(j, n);
			const shift = spring(since, 520, 36);
			let y = before === null ? target : lerp(before, target, shift);
			let x = m.mine ? panel.w - 36 - m.w : 36;
			let scale = 1;
			if (j === n - 1) {
				const p = springs.snap(t - arrive[j]);
				if (m.mine) {
					y = lerp(panel.h - 120, target, p);
					x = lerp(60, x, settle(clamp((t - arrive[j]) / 0.35)));
					scale = lerp(0.6, 1, p);
				} else {
					const late = t - arrive[j] - 0.07;
					scale = late < 0 ? 0 : lerp(0.3, 1, springs.pop(late));
				}
			}
			css(m.bubble, {
				left: `${x}px`,
				top: `${y}px`,
				transformOrigin: m.mine ? '100% 100%' : '0% 100%',
				transform: `scale(${scale})`,
				opacity: '1'
			});
		});

		// The teacher typing, low on the left.
		const typingIn = t < 1.45 ? 0 : springs.pop(t - 1.45);
		css(typingBubble, {
			top: `${bottom - 70}px`,
			transformOrigin: '0% 100%',
			transform: `scale(${typingIn})`,
			opacity: t < arrive[1] ? 1 : 0
		});
		dots.forEach((dot, i) => {
			const phase = (((t * 2.4 - i * 0.18) % 1) + 1) % 1;
			const lift = phase < 0.5 ? Math.sin(phase * Math.PI * 2) : 0;
			css(dot, { transform: `translateY(${-lift * 9}px)`, opacity: 0.45 + lift * 0.55 });
		});

		// The panel turns over to the meetings on its back.
		const flip = ease.inCubic(progress(t, 3.55, 0.45));
		place(card, {
			perspective: 2400,
			rotateY: flip * 90,
			scale: lerp(1, 0.94, Math.sin(flip * Math.PI))
		});
		const privacyIn = springs.pop(t - 0.5);
		css(privacy, { transform: `scale(${t < 0.5 ? 0 : privacyIn})` });
		lock.draw(progress(t, 0.55, 0.5));
	};
}
