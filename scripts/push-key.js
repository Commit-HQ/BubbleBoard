// Creates the key that signs notifications (VAPID, RFC 8292) when the installation has none (docs/hosting.md).
// Devices subscribe with its public half, so an existing key is never
// replaced: a new one stops every device's notifications until the app renews them.
//
//   node scripts/push-key.js           stores it as the deployed Worker's VAPID_KEY secret (npm run deploy)
//   node scripts/push-key.js --local   writes it to .dev.vars (npm run dev)
//
// The secret is the private key's x, y, and d in base64url, joined by dots (src/lib/server/push.ts). Cloudflare
// never shows a secret again, so a new deployed key is shown once, to be kept in a password manager.

import { hasDevVar, hasSecret, setDevVar, wrangler } from './wrangler.js';

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
	if (!hasDevVar('VAPID_KEY')) setDevVar('VAPID_KEY', await newKey());
} else if (!hasSecret('VAPID_KEY')) {
	// A deploy without a terminal, such as in CI, would put the key in a log.
	if (!process.stdout.isTTY) {
		console.log(
			'No notifications key yet: run `node scripts/push-key.js` in a terminal to make one.'
		);
		process.exit(0);
	}
	const key = await newKey();
	wrangler(['secret', 'put', 'VAPID_KEY'], key);
	console.log(`
Created the key that signs notifications (VAPID_KEY). Cloudflare can't show it again, so save it in a
password manager now. If this Worker is deleted or moves to another Cloudflare account, put the key back
with \`npx wrangler secret put VAPID_KEY\` after the first deploy there:

  ${key}
`);
}
