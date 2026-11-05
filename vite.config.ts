import adapter from '@sveltejs/adapter-cloudflare';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

const { version } = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string };

// Shown in the footer so a page can be traced to what it was built from (product-spec.md §47). "-dirty"
// marks uncommitted changes, including new files Git doesn't ignore, which the commit alone doesn't
// describe. Builds without Git metadata, such as from a source ZIP, are "unknown".
function commit() {
	const git = (command: string) =>
		execSync(`git ${command}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
	try {
		const sha = git('rev-parse --short HEAD');
		if (git('status --porcelain')) return { built: `${sha}-dirty`, release: false };
		// A release is the clean commit its version's tag points at (docs/development.md#releasing).
		return { built: sha, release: git('tag --points-at HEAD').split('\n').includes(`v${version}`) };
	} catch {
		return { built: 'unknown', release: false };
	}
}
const { built, release } = commit();
// One stamp for the whole build. Vite evaluates this file more than once per build, for the client and
// for the server, and SvelteKit names the global its pages and chunks share after the version, so a stamp
// taken anew each time would leave the prerendered pages and the client chunks calling it by different
// names, and no page would start. The environment keeps the first one for the later evaluations.
const stamp = (process.env.BUILD_STAMP ??= Date.now().toString(36));

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
			// The version an open app compares with the server's to tell a new deploy has come
			// (src/routes/(app)/+layout.svelte). It's new with every build, even from the same commit, so a
			// rebuild with uncommitted changes counts too; the footer takes the version and commit from `define`.
			version: { name: `${built}.${stamp}` },
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
	// The footer shows the version alone for a release, and the commit next to it for any other build.
	define: {
		__VERSION__: JSON.stringify(version),
		__COMMIT__: JSON.stringify(release ? '' : built)
	},
	build: {
		// Emit every asset as a hashed file instead of a data: URI, so the CSP can stay 'self'-only.
		assetsInlineLimit: 0
	},
	test: {
		include: ['src/**/*.test.ts']
	}
});
