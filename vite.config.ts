import adapter from '@sveltejs/adapter-cloudflare';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { execSync } from 'node:child_process';
import { defineConfig } from 'vitest/config';

// Shown in the footer so a page can be traced to the commit it was built from (product-spec.md §47).
// "-dirty" marks uncommitted changes, including new files Git doesn't ignore, which the commit alone
// doesn't describe. Builds without Git metadata, such as from a source ZIP, are "unknown".
function commit() {
	const git = (command: string) =>
		execSync(`git ${command}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
	try {
		const sha = git('rev-parse --short HEAD');
		return git('status --porcelain') ? `${sha}-dirty` : sha;
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
			// The adapter writes its fetch handler where wrangler.build.jsonc says, and worker/index.js, the
			// Worker's entry in wrangler.jsonc, adds the queue and scheduled handlers to it.
			adapter: adapter({ config: 'wrangler.build.jsonc' }),
			version: { name: commit() },
			csp: {
				mode: 'hash',
				// Styles, fonts, and connections fall back to default-src, and SvelteKit adds hashes for its
				// inline scripts and styles.
				directives: {
					'default-src': ['self'],
					// HEIC photos open with libheif, compiled to WebAssembly, where the browser can't open them
					// (src/lib/heif.ts). This lets scripts compile WebAssembly, not run text as code.
					'script-src': ['self', 'wasm-unsafe-eval'],
					// Board photos are decrypted in the browser and shown from the blob: URLs it makes for them.
					'img-src': ['self', 'blob:'],
					// SvelteKit's route announcer, on pages that run in the browser, has one fixed inline
					// style attribute. This allows exactly that value, not inline styles in general, and
					// src/csp.test.ts fails when a SvelteKit update changes it.
					'style-src-attr': [
						'unsafe-hashes',
						'sha256-S8qMpvofolR8Mpjy4kQvEm7m1q8clzU4dfDH0AmvZjo='
					],
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
	},
	test: {
		include: ['src/**/*.test.ts']
	}
});
