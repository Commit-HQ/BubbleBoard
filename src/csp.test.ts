import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

// Pages that run in the browser render SvelteKit's route announcer, whose inline style attribute the CSP
// in vite.config.ts allows by hash. A SvelteKit update that changes the style needs a new hash.
it('allows the route announcer style of the installed SvelteKit', () => {
	const root = readFileSync('node_modules/@sveltejs/kit/src/core/sync/write_root.js', 'utf8');
	const style = /id="svelte-announcer"[^>]*\sstyle="([^"]+)"/.exec(root)?.[1];
	expect(style).toBeDefined();
	const hash = `sha256-${createHash('sha256').update(style!).digest('base64')}`;
	expect(readFileSync('vite.config.ts', 'utf8')).toContain(`'${hash}'`);
});
