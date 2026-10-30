// Renders the reel to video: serves the repository to a headless Chromium, steps it through every frame
// in parallel, synthesizes the score from the scenes' cues (score.js), and encodes both with ffmpeg.
//
//   node video/render.js                      both languages, video/bubbleboard-{en,hr}.mp4
//   node video/render.js --lang hr            one language
//   node video/render.js --still 9.5,27       PNG frames at those seconds, in video/out
//   node video/render.js --from 26 --to 32    a stretch, for a quick look
//   node video/render.js --score              only the soundtrack, in video/out
//   node video/render.js --preview            serve the page to open in a browser
//
// Needs the repository's own dependencies (npm ci) for the fonts, ffmpeg on the PATH, and Playwright with
// Chromium (npx playwright install chromium).

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { score } from './score.js';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const out = path.join(here, 'out');

const args = process.argv.slice(2);
const option = (name, fallback) => {
	const index = args.indexOf(`--${name}`);
	return index === -1 ? fallback : (args[index + 1] ?? true);
};
const langs = option('lang', 'all') === 'all' ? ['en', 'hr'] : [option('lang')];
const workers = Number(option('workers', Math.max(1, Math.min(4, os.cpus().length))));
const quality = Number(option('quality', 95));

const types = {
	'.html': 'text/html; charset=utf-8',
	'.js': 'text/javascript; charset=utf-8',
	'.css': 'text/css; charset=utf-8',
	'.json': 'application/json',
	'.svg': 'image/svg+xml',
	'.webp': 'image/webp',
	'.avif': 'image/avif',
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.woff2': 'font/woff2',
	'.ts': 'text/plain; charset=utf-8'
};

/** Serves the repository, read-only, so the reel uses the app's own assets and fonts where they live. */
function serve() {
	const server = http.createServer((request, response) => {
		const pathname = decodeURIComponent(new URL(request.url, 'http://reel').pathname);
		const file = path.join(root, pathname === '/' ? 'video/index.html' : pathname);
		if (!file.startsWith(root + path.sep)) {
			response.writeHead(403).end();
			return;
		}
		fs.readFile(file, (error, data) => {
			if (error) {
				response.writeHead(404).end();
				return;
			}
			response.writeHead(200, {
				'content-type': types[path.extname(file)] ?? 'application/octet-stream'
			});
			response.end(data);
		});
	});
	return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

/** A page with the reel loaded and ready to draw. */
async function open(browser, url) {
	const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
	page.on('pageerror', (error) => console.error(`page: ${error.message}`));
	page.on('console', (message) => {
		if (message.type() === 'error') console.error(`console: ${message.text()}`);
	});
	await page.goto(url);
	await page.waitForFunction(() => window.reel?.ready || window.reel?.error, null, {
		timeout: 60000
	});
	const error = await page.evaluate(() => window.reel.error);
	if (error) throw new Error(error);
	const cdp = await page.context().newCDPSession(page);
	return {
		page,
		info: () => page.evaluate(() => ({ duration: reel.duration, fps: reel.fps, cues: reel.cues })),
		async frame(t, format = 'jpeg') {
			await page.evaluate((t) => window.reel.renderFrame(t), t);
			const shot = await cdp.send('Page.captureScreenshot', {
				format,
				quality: format === 'jpeg' ? quality : undefined,
				optimizeForSpeed: true
			});
			return Buffer.from(shot.data, 'base64');
		}
	};
}

function run(command, list) {
	return new Promise((resolve, reject) => {
		const child = spawn(command, list, { stdio: ['ignore', 'inherit', 'inherit'] });
		child.on('exit', (code) =>
			code === 0 ? resolve() : reject(new Error(`${command} exited ${code}`))
		);
	});
}

/** Renders frames `first` to `last - 1` into one file of JPEGs, one after another. */
async function renderPart(url, fps, first, last, file, report) {
	const browser = await chromium.launch();
	try {
		const reel = await open(browser, url);
		const stream = fs.createWriteStream(file);
		for (let frame = first; frame < last; frame++) {
			const jpeg = await reel.frame(frame / fps);
			if (!stream.write(jpeg)) await new Promise((resolve) => stream.once('drain', resolve));
			report();
		}
		await new Promise((resolve) => stream.end(resolve));
	} finally {
		await browser.close();
	}
}

async function renderLanguage(base, lang) {
	const url = `${base}/video/index.html?render&lang=${lang}`;
	const browser = await chromium.launch();
	const reel = await open(browser, url);
	const { duration, fps, cues } = await reel.info();

	const stills = option('still');
	if (stills) {
		for (const t of String(stills).split(',').map(Number)) {
			const file = path.join(out, `still-${lang}-${t.toFixed(2)}.png`);
			fs.writeFileSync(file, await reel.frame(t, 'png'));
			console.log(file);
		}
		await browser.close();
		return;
	}
	await browser.close();

	const from = Number(option('from', 0));
	const to = Math.min(duration, Number(option('to', duration)));
	const first = Math.round(from * fps);
	const last = Math.round(to * fps);
	const whole = from === 0 && to === duration;

	fs.writeFileSync(path.join(out, `cues-${lang}.json`), JSON.stringify(cues, null, '\t'));
	const wav = path.join(out, `score-${lang}.wav`);
	if (!args.includes('--silent')) {
		console.log(`${lang}: scoring ${cues.length} cues`);
		await score({ cues, duration, file: wav });
		if (args.includes('--score')) {
			console.log(`${lang}: ${wav}`);
			return;
		}
	}

	const total = last - first;
	let done = 0;
	const began = Date.now();
	const report = () => {
		done++;
		if (done % 60 === 0 || done === total) {
			const rate = done / ((Date.now() - began) / 1000);
			process.stdout.write(
				`\r${lang}: ${done}/${total} frames, ${rate.toFixed(1)} fps, ${Math.round((total - done) / rate)} s left   `
			);
		}
	};
	const size = Math.ceil(total / workers);
	const parts = [];
	const jobs = [];
	for (let k = 0; k < workers; k++) {
		const a = first + k * size;
		const b = Math.min(last, a + size);
		if (a >= b) break;
		const file = path.join(out, `frames-${lang}-${k}.mjpeg`);
		parts.push(file);
		jobs.push(renderPart(url, fps, a, b, file, report));
	}
	await Promise.all(jobs);
	process.stdout.write('\n');

	const name = whole ? `bubbleboard-${lang}.mp4` : `out/clip-${lang}-${from}-${to}.mp4`;
	const target = path.join(here, name);
	const audio = args.includes('--silent')
		? []
		: ['-ss', String(from), '-t', String(to - from), '-i', wav];
	// Chromium's JPEGs are full-range BT.601; the video is limited-range BT.709, tagged as such.
	await run('ffmpeg', [
		'-y',
		'-loglevel',
		'error',
		'-f',
		'mjpeg',
		'-framerate',
		String(fps),
		'-i',
		`concat:${parts.join('|')}`,
		...audio,
		'-vf',
		'scale=in_color_matrix=bt601:in_range=full:out_color_matrix=bt709:out_range=tv,format=yuv420p',
		'-c:v',
		'libx264',
		'-preset',
		option('preset', 'slow'),
		'-crf',
		String(option('crf', 20)),
		'-profile:v',
		'high',
		'-color_primaries',
		'bt709',
		'-color_trc',
		'bt709',
		'-colorspace',
		'bt709',
		...(audio.length ? ['-c:a', 'aac', '-b:a', '256k'] : []),
		'-movflags',
		'+faststart',
		'-shortest',
		target
	]);
	for (const part of parts) fs.rmSync(part);
	console.log(`${lang}: ${target}`);
}

fs.mkdirSync(out, { recursive: true });
const server = await serve();
const base = `http://127.0.0.1:${server.address().port}`;
if (args.includes('--preview')) {
	console.log(`${base}/video/index.html?lang=en`);
	console.log(`${base}/video/index.html?lang=hr`);
} else {
	try {
		for (const lang of langs) await renderLanguage(base, lang);
	} finally {
		server.close();
	}
}
