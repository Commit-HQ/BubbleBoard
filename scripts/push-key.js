// Creates the key that signs notifications (VAPID, RFC 8292) when the installation has none (README,
// "Deploy your own installation"). Devices subscribe with its public half, so a new key would silently end
// every device's notifications: an existing key is never replaced.
//
//   node scripts/push-key.js           stores it as the deployed Worker's VAPID_KEY secret (npm run deploy)
//   node scripts/push-key.js --local   writes it to .dev.vars (npm run dev)
//
// The secret is the private key's x, y, and d in base64url, joined by dots (src/lib/server/push.ts).

import { execFileSync } from 'node:child_process';
import { chmodSync, existsSync, readFileSync, writeFileSync } from 'node:fs';

function wrangler(args, input) {
	return execFileSync('npx', ['wrangler', ...args], {
		input,
		encoding: 'utf8',
		stdio: [input === undefined ? 'inherit' : 'pipe', 'pipe', 'inherit'],
		shell: process.platform === 'win32'
	});
}

async function newKey() {
	const { privateKey } = await crypto.subtle.generateKey(
		{ name: 'ECDSA', namedCurve: 'P-256' },
		true,
		['sign', 'verify']
	);
	const { x, y, d } = await crypto.subtle.exportKey('jwk', privateKey);
	return `${x}.${y}.${d}`;
}

if (process.argv.includes('--local')) {
	const lines = existsSync('.dev.vars')
		? readFileSync('.dev.vars', 'utf8').split('\n').filter(Boolean)
		: [];
	if (!lines.some((line) => line.startsWith('VAPID_KEY='))) {
		writeFileSync('.dev.vars', [...lines, `VAPID_KEY=${await newKey()}`, ''].join('\n'), {
			mode: 0o600
		});
		chmodSync('.dev.vars', 0o600);
		// Generated types list the variables in .dev.vars.
		wrangler(['types']);
	}
} else {
	const listed = wrangler(['secret', 'list', '--format', 'json']);
	const secrets = JSON.parse(listed.slice(listed.indexOf('['), listed.lastIndexOf(']') + 1));
	if (!secrets.some(({ name }) => name === 'VAPID_KEY')) {
		wrangler(['secret', 'put', 'VAPID_KEY'], await newKey());
		console.log('Created the key that signs notifications (VAPID_KEY).');
	}
}
