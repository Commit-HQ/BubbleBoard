// Publishes the built Worker and applies new migrations (npm run deploy). A deploy that creates the database,
// the notifications queue, or the files bucket also writes them into wrangler.jsonc. Later deploys find them
// by name, so the file goes back to how it was, the same for every installation, however the deploy ends.

import { readFileSync, writeFileSync } from 'node:fs';
import { runWrangler } from './wrangler.js';

const config = readFileSync('wrangler.jsonc', 'utf8');
try {
	runWrangler(['deploy']);
	runWrangler(['d1', 'migrations', 'apply', 'DB', '--remote']);
} catch {
	// Wrangler has already said what went wrong.
	process.exitCode = 1;
} finally {
	if (readFileSync('wrangler.jsonc', 'utf8') !== config) writeFileSync('wrangler.jsonc', config);
}
