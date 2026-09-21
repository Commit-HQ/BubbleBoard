// Creates a setup token and prints the link that sets up BubbleBoard (docs/hosting.md).
//
//   npm run setup-link           stores the token as the deployed Worker's SETUP_TOKEN secret
//   npm run setup-link:local     writes it to .dev.vars for `npm run dev`
//   --if-missing                 does nothing when the deployed Worker already has the secret (deploy)
//
// A new token replaces the old one. It only allows the first setup, and the link carries it in the
// fragment, which browsers don't send to the server.

import { randomBytes } from 'node:crypto';
import { hasSecret, setDevVar, wrangler } from './wrangler.js';

const options = new Set(process.argv.slice(2));
const token = randomBytes(32).toString('base64url');

function publicOrigin() {
	try {
		process.loadEnvFile('.env');
	} catch {
		// PUBLIC_SITE_URL may also come from the environment.
	}
	if (!URL.canParse(process.env.PUBLIC_SITE_URL ?? '')) {
		console.error('Set PUBLIC_SITE_URL in .env first (see .env.example).');
		process.exit(1);
	}
	return new URL(process.env.PUBLIC_SITE_URL).origin;
}

let origin;
if (options.has('--local')) {
	setDevVar('SETUP_TOKEN', token);
	origin = 'http://localhost:5173';
	console.log('SETUP_TOKEN is in .dev.vars. Restart `npm run dev` if it is running.');
} else {
	origin = publicOrigin();
	if (options.has('--if-missing')) {
		if (hasSecret('SETUP_TOKEN')) process.exit(0);
		// A deploy without a terminal, such as in CI, would put the link in a log.
		if (!process.stdout.isTTY) {
			console.log('No setup link yet: run `npm run setup-link` in a terminal to make one.');
			process.exit(0);
		}
	}
	wrangler(['secret', 'put', 'SETUP_TOKEN'], token);
}

console.log(`
Open this link to set up BubbleBoard. It works until someone completes the setup:

  ${origin}/app/setup#token=${token}
`);
