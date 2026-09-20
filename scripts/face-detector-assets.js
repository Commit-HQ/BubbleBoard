import { copyFileSync, mkdirSync, readFileSync } from 'node:fs';

// A classic worker loads the CommonJS distribution using importScripts. Serve it with a .js suffix:
// Cloudflare serves .cjs as application/node, which browsers correctly refuse as executable JavaScript.
// WASM loaders/binaries are emitted by Vite; only this file needs a public filename with the right type.
const source = new URL('../node_modules/@mediapipe/tasks-vision/', import.meta.url);
const { version } = JSON.parse(readFileSync(new URL('package.json', source), 'utf8'));
if (version !== '0.10.32')
	throw new Error('Review the face detector runtime before upgrading MediaPipe');
const destination = new URL('../static/face-detector/', import.meta.url);
mkdirSync(destination, { recursive: true });
copyFileSync(new URL('vision_bundle.cjs', source), new URL(`vision-${version}.js`, destination));
