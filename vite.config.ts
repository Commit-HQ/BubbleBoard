import adapter from '@sveltejs/adapter-cloudflare';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { execSync } from 'node:child_process';
import { defineConfig } from 'vite';

// Shown in the footer so a page can be traced to the commit it was built from (product-spec.md §47).
// "-dirty" marks uncommitted changes to tracked files, which the commit alone doesn't describe. Builds
// without Git metadata, such as from a source ZIP, are "unknown".
function commit() {
	const git = (command: string) =>
		execSync(`git ${command}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
	try {
		const sha = git('rev-parse --short HEAD');
		return git('status --porcelain --untracked-files=no') ? `${sha}-dirty` : sha;
	} catch {
		return 'unknown';
	}
}

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter(),
			version: { name: commit() },
			csp: {
				mode: 'hash',
				// Scripts, styles, images, fonts, and connections fall back to default-src, and SvelteKit
				// adds hashes for its inline scripts and styles. Before enabling csr on a route, plan for
				// the route announcer's inline style attribute instead of allowing 'unsafe-inline'.
				directives: {
					'default-src': ['self'],
					'base-uri': ['none'],
					'form-action': ['self'],
					'frame-ancestors': ['none'],
					'object-src': ['none']
				}
			}
		})
	],
	build: {
		// Emit every asset as a hashed file instead of a data: URI, so the CSP can stay 'self'-only.
		assetsInlineLimit: 0
	}
});
