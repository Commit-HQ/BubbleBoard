// Creates the key that signs notifications (VAPID, RFC 8292) when the installation has none (README,
// "Deploy your own installation"). Devices subscribe with its public half, so a new key would silently end
// every device's notifications: an existing key is never replaced.
//
//   node scripts/push-key.js           stores it as the deployed Worker's VAPID_KEY secret (npm run deploy)
//   node scripts/push-key.js --local   writes it to .dev.vars (npm run dev)
//
// The secret is the private key's x, y, and d in base64url, joined by dots (src/lib/server/push.ts).

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
	wrangler(['secret', 'put', 'VAPID_KEY'], await newKey());
	console.log('Created the key that signs notifications (VAPID_KEY).');
}
