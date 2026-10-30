// The reel's runtime. It mounts every scene once, then draws any moment on request: `reel.renderFrame(t)`
// puts the whole stage where it is at `t` seconds, from nothing but `t`. render.js steps through the frames
// with it; opened in a browser on its own, the page plays the reel with a scrubber.
//
// Each scene in scenes/ exports `mount(ctx)`, which builds its elements and returns `update(t)`, called
// with the time since the scene's start while the scene is on screen. A scene may also export `lead` and
// `linger`, the seconds it shows before its start and after its end, to overlap the scenes beside it.
// Scenes call `ctx.cue` for the sounds the score should play on their moments.

import { scenes, duration, fps, width, height, beat, bar } from './timeline.js';
import { copy } from './copy.js';
import { el, decoded } from './lib/dom.js';
import { backdrop } from './scenes/backdrop.js';

const params = new URLSearchParams(location.search);
const lang = params.get('lang') === 'hr' ? 'hr' : 'en';
document.documentElement.lang = lang;

const stage = document.getElementById('stage');
const cues = [];

const fontsReady = Promise.all([
	document.fonts.load('400 100px "Hedvig Letters Serif"', 'AaŽžČčĆćĐđŠš'),
	...[200, 400, 500, 600, 700, 800, 900].map((w) =>
		document.fonts.load(`${w} 100px "Hanken Grotesk"`, 'AaŽžČčĆćĐđŠš')
	),
	document.fonts.load('400 40px "JetBrains Mono"')
]);

async function start() {
	await fontsReady;
	const background = backdrop();
	stage.append(background.root);
	const mounted = [];
	for (const [index, scene] of scenes.entries()) {
		const module = await import(`./scenes/${scene.name}.js`);
		const root = el('div', { class: 'layer', 'data-scene': scene.name });
		root.style.zIndex = String(module.z ?? index + 1);
		stage.append(root);
		const ctx = {
			lang,
			text: copy[lang][scene.name],
			copy: copy[lang],
			root,
			start: scene.start,
			length: scene.end - scene.start,
			beat,
			bar,
			/** Asks the score for a sound at `t` seconds into this scene. */
			cue: (t, type, options = {}) => cues.push({ t: scene.start + t, type, ...options })
		};
		const update = await module.mount(ctx);
		mounted.push({
			...scene,
			root,
			update,
			from: scene.start - (module.lead ?? 0),
			to: scene.end + (module.linger ?? 0)
		});
	}
	await decoded(stage);
	cues.sort((a, b) => a.t - b.t);

	let last = -1;
	function renderFrame(t) {
		background.update(t);
		for (const scene of mounted) {
			const on = t >= scene.from && t < scene.to;
			scene.root.style.display = on ? 'block' : 'none';
			if (on) scene.update(t - scene.start);
		}
		last = t;
	}
	renderFrame(0);

	window.reel = { lang, duration, fps, width, height, cues, renderFrame, ready: true };
	if (!params.has('render')) player(renderFrame, () => last);
}

/** Plays the reel in the browser, scaled to the window, with a scrubber and the keyboard. */
function player(renderFrame, now) {
	const fit = () => {
		const scale = Math.min(innerWidth / width, (innerHeight - 56) / height);
		stage.style.transform = `scale(${scale})`;
		document.body.style.height = `${height * scale + 56}px`;
	};
	addEventListener('resize', fit);
	fit();
	const scrubber = el('input', {
		type: 'range',
		min: 0,
		max: duration,
		step: 1 / fps,
		value: 0,
		style: {
			position: 'fixed',
			left: '16px',
			right: '16px',
			bottom: '16px',
			width: 'calc(100% - 32px)'
		}
	});
	document.body.append(scrubber);
	let playing = !params.has('t');
	let origin = performance.now() / 1000 - (Number(params.get('t')) || 0);
	const seek = (t) => {
		origin = performance.now() / 1000 - t;
		renderFrame(t);
		scrubber.value = t;
	};
	scrubber.addEventListener('input', () => seek(Number(scrubber.value)));
	addEventListener('keydown', (event) => {
		if (event.key === ' ') {
			playing = !playing;
			seek(now());
		}
		if (event.key === 'ArrowRight')
			seek(Math.min(duration, now() + (event.shiftKey ? 1 : 1 / fps)));
		if (event.key === 'ArrowLeft') seek(Math.max(0, now() - (event.shiftKey ? 1 : 1 / fps)));
	});
	seek(Number(params.get('t')) || 0);
	const tick = () => {
		if (playing) {
			const t = (performance.now() / 1000 - origin) % duration;
			renderFrame(t);
			scrubber.value = t;
		}
		requestAnimationFrame(tick);
	};
	requestAnimationFrame(tick);
}

start().catch((error) => {
	window.reel = { error: String(error?.stack ?? error) };
	console.error(error);
});
