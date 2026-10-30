// Individual meetings, on the back of the conversation. The day's times slide in, some already taken by
// families nobody names; a finger taps Reserve, the time becomes the family's own with the spotlight's
// colours round it, and a few bubbles float up. Then the camera drops into the night of a lock screen.

import { el, css, place, words } from '../lib/dom.js';
import { clamp, lerp, ease, progress, springs, settle, random } from '../lib/motion.js';
import { icon, colors, iridescent, bubbleImage } from '../lib/kit.js';
import { whip, motionBlur } from '../lib/fx.js';
import { panel } from './messages.js';

export const linger = 0.35;

export function mount({ root, text, copy, cue }) {
	const scene = el('div', { class: 'layer' });
	root.append(scene);
	const blur = motionBlur(scene);

	const title = el('div', {
		class: 'display',
		style: { left: '120px', top: '300px', fontSize: '104px', width: '820px', whiteSpace: 'normal' }
	});
	const titleWords = words(title, text.title);
	scene.append(title);
	const note = el('div', {
		style: {
			left: '124px',
			top: `${300 + title.offsetHeight + 34}px`,
			width: '760px',
			fontSize: '38px',
			fontWeight: 500,
			lineHeight: '1.3',
			color: colors.muted
		}
	});
	const noteWords = words(note, text.note);
	scene.append(note);

	const card = el('div', {
		class: 'glass',
		style: {
			left: `${panel.x}px`,
			top: `${panel.y}px`,
			width: `${panel.w}px`,
			height: `${panel.h}px`,
			borderRadius: '48px',
			background: 'rgb(255 255 255 / 0.62)'
		}
	});
	scene.append(card);
	const day = el('div', {
		class: 'display',
		style: { left: '44px', top: '42px', fontSize: '50px' }
	});
	day.textContent = text.day;
	const where = el('div', {
		style: { left: '46px', top: '108px', fontSize: '26px', fontWeight: 500, color: colors.muted }
	});
	where.textContent = `${copy.board.classroom} · ${copy.board.teachers[0]}`;
	card.append(day, where);

	const top = 180;
	const height = 106;
	const gap = 14;
	const rows = text.slots.map((slot, i) => {
		const taken = slot.state === 'taken';
		const row = el('div', {
			style: {
				left: '30px',
				top: `${top + i * (height + gap)}px`,
				width: `${panel.w - 60}px`,
				height: `${height}px`,
				borderRadius: '28px',
				background: taken ? 'rgb(22 20 43 / 0.05)' : 'rgb(255 255 255 / 0.9)',
				boxShadow: taken ? 'none' : '0 14px 30px -22px rgb(46 32 120 / 0.4)'
			}
		});
		const time = el('div', {
			style: {
				left: '30px',
				top: '18px',
				fontSize: '33px',
				fontWeight: 700,
				color: taken ? colors.muted : colors.ink,
				whiteSpace: 'nowrap'
			}
		});
		time.textContent = slot.time;
		const state = el('div', {
			style: {
				left: '31px',
				top: '62px',
				fontSize: '24px',
				fontWeight: 500,
				color: colors.muted,
				whiteSpace: 'nowrap'
			}
		});
		state.textContent = taken ? text.taken : text.free;
		row.append(time, state);
		let button = null;
		if (!taken) {
			button = el('div', {
				style: {
					right: '22px',
					top: '22px',
					height: '62px',
					padding: '0 30px',
					borderRadius: '31px',
					border: `2px solid rgb(124 92 255 / 0.35)`,
					color: colors.accent,
					fontSize: '26px',
					fontWeight: 700,
					display: 'grid',
					placeItems: 'center',
					whiteSpace: 'nowrap',
					background: 'white'
				}
			});
			button.textContent = text.reserve;
			row.append(button);
		}
		card.append(row);
		return { row, time, state, button, pick: slot.state === 'pick' };
	});
	const picked = rows.find((r) => r.pick);
	const index = rows.indexOf(picked);

	// The booked state: the spotlight's ring, the family's name, and a tick.
	const ring = el('div', {
		style: {
			left: '-4px',
			top: '-4px',
			width: `${panel.w - 52}px`,
			height: `${height + 8}px`,
			borderRadius: '32px',
			padding: '4px',
			mask: 'linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0)',
			webkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
			webkitMaskComposite: 'xor'
		}
	});
	picked.row.append(ring);
	const yours = el('div', {
		style: {
			left: '31px',
			top: '62px',
			fontSize: '24px',
			fontWeight: 700,
			color: colors.accent,
			whiteSpace: 'nowrap'
		}
	});
	yours.textContent = text.yours;
	picked.row.append(yours);
	const done = el('div', {
		style: {
			right: '24px',
			top: '20px',
			width: '66px',
			height: '66px',
			borderRadius: '50%',
			background: colors.mint
		}
	});
	const tick = icon('check', 40, { color: colors.ink, width: 3.2 });
	place(tick.node, { x: 13, y: 14 });
	done.append(tick.node);
	picked.row.append(done);

	// A finger, and the bubbles the booking lets go.
	const finger = el('div', {
		style: {
			width: '84px',
			height: '84px',
			borderRadius: '50%',
			background: 'rgb(255 255 255 / 0.55)',
			border: '3px solid white',
			boxShadow: '0 16px 30px -10px rgb(22 20 43 / 0.45)'
		}
	});
	const ripple = el('div', {
		style: {
			width: '84px',
			height: '84px',
			borderRadius: '50%',
			border: `4px solid ${colors.accent}`
		}
	});
	scene.append(ripple, finger);
	const rand = random(41);
	const floaters = Array.from({ length: 9 }, () => {
		const size = rand.range(26, 64);
		const node = bubbleImage(size);
		scene.append(node);
		return {
			node,
			size,
			dx: rand.range(-160, 160),
			rise: rand.range(220, 460),
			delay: rand.range(0, 0.25)
		};
	});

	const TAP = 1.5;
	const rowY = (i) => panel.y + top + i * (height + gap);
	const buttonX = panel.x + panel.w - 30 - 22 - 110;
	const buttonY = rowY(index) + height / 2;

	cue(0, 'flip');
	cue(0.35, 'blip', { count: 5, spacing: 0.07, pitch: 1 });
	cue(TAP - 0.02, 'tap');
	cue(TAP + 0.05, 'success');
	cue(TAP + 0.15, 'bubbles');
	cue(3.6, 'whip', { length: 0.7, down: true });

	return (t) => {
		// Arrive turning over from the conversation, and leave by dropping down a frame.
		const flip = ease.outCubic(progress(t, 0, 0.45));
		place(card, {
			perspective: 2400,
			rotateY: (1 - flip) * -90,
			scale: lerp(0.94, 1, flip)
		});
		const pan = whip(t, 3.6, 0.7, 1080);
		scene.style.transform = `translateY(${-pan.x}px)`;
		blur(0, pan.speed);

		titleWords.forEach((word, i) => {
			const p = settle(progress(t, 0.05 + i * 0.07, 0.8));
			css(word.inner, { transform: `translateY(${(1 - p) * 105}%)`, opacity: clamp(p * 2) });
		});
		noteWords.forEach((word, i) => {
			const p = settle(progress(t, 0.5 + i * 0.03, 0.7));
			css(word.inner, { transform: `translateY(${(1 - p) * 105}%)`, opacity: clamp(p * 2) });
		});

		rows.forEach((r, i) => {
			const p = springs.snap(t - 0.35 - i * 0.07);
			css(r.row, {
				transform: `translateX(${(1 - p) * 120}px)`,
				opacity: t < 0.35 + i * 0.07 ? 0 : clamp(p * 2)
			});
		});

		// The finger comes in, presses, and lifts away.
		const reach = settle(progress(t, 0.8, 0.65));
		const press = Math.sin(clamp((t - TAP + 0.1) / 0.2) * Math.PI);
		const away = ease.inCubic(progress(t, TAP + 0.25, 0.5));
		place(finger, {
			x: lerp(1900, buttonX, reach) - 42 + away * 160,
			y: lerp(1000, buttonY, reach) - 42 + away * 260,
			scale: 1 - press * 0.18,
			opacity: t < 0.8 ? 0 : 1 - away
		});
		const wave = progress(t, TAP, 0.6);
		place(ripple, {
			x: buttonX - 42,
			y: buttonY - 42,
			scale: lerp(0.6, 2.6, ease.outCubic(wave)),
			opacity: wave > 0 && wave < 1 ? 1 - wave : 0
		});

		// Booked.
		const booked = t >= TAP;
		const grow = springs.pop(t - TAP);
		picked.button.style.opacity = booked ? '0' : '1';
		picked.button.style.transform = `scale(${1 - press * 0.08})`;
		picked.state.style.opacity = booked ? '0' : '1';
		css(yours, {
			opacity: booked ? clamp((t - TAP) * 6) : 0,
			transform: `translateY(${booked ? (1 - settle(clamp((t - TAP) / 0.4))) * 16 : 16}px)`
		});
		css(done, { transform: `scale(${booked ? grow : 0})` });
		tick.draw(progress(t, TAP + 0.08, 0.3));
		ring.style.background = `conic-gradient(from ${t * 200}deg, ${[...iridescent, iridescent[0]].join(', ')})`;
		ring.style.opacity = booked ? String(clamp((t - TAP) * 4)) : '0';
		css(picked.row, {
			transform: `translateX(0) scale(${booked ? 1 + Math.sin(clamp((t - TAP) / 0.35) * Math.PI) * 0.035 : 1})`
		});

		floaters.forEach((f) => {
			const since = t - TAP - 0.1 - f.delay;
			const p = clamp(since / 1.4);
			place(f.node, {
				x: buttonX + f.dx * ease.outCubic(p) - f.size / 2,
				y: buttonY - f.rise * ease.outCubic(p) - f.size / 2,
				scale: since < 0 ? 0 : springs.pop(since) * (1 - ease.inQuad(p) * 0.3),
				opacity: since < 0 ? 0 : 1 - ease.inQuad(p)
			});
		});
	};
}
