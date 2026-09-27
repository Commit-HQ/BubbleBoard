// Publishes the built Worker and applies new migrations (npm run deploy). The migrations go first, so the new
// code never runs against a schema it doesn't know; the code already running keeps working meanwhile, since
// migrations only add. The first deploy is the exception: it creates the database, so it publishes first.
// A deploy that creates the database, the notifications queue, or the files bucket also writes them into
// wrangler.jsonc. Later deploys find them by name, so the file goes back to how it was, the same for every
// installation, however the deploy ends.

import { readFileSync, writeFileSync } from 'node:fs';
import { hasDatabase, runWrangler, wrangler } from './wrangler.js';

const config = readFileSync('wrangler.jsonc', 'utf8');
function migrate() {
	runWrangler(['d1', 'migrations', 'apply', 'DB', '--remote']);
	// Answering no to Wrangler's question ends it without an error, and the new code mustn't go out without
	// its schema.
	if (
		!wrangler(['d1', 'migrations', 'list', 'DB', '--remote']).includes('No migrations to apply')
	) {
		console.error(
			'The migrations were not applied, so the deploy stopped. Run it again to apply them.'
		);
		throw new Error('Migrations not applied');
	}
}
try {
	const existing = hasDatabase(config.match(/"database_name":\s*"([^"]+)"/)[1]);
	if (existing) migrate();
	runWrangler(['deploy']);
	if (!existing) migrate();
} catch {
	// What went wrong has already been said.
	process.exitCode = 1;
} finally {
	if (readFileSync('wrangler.jsonc', 'utf8') !== config) writeFileSync('wrangler.jsonc', config);
}
