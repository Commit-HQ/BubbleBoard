import adapter from '@sveltejs/adapter-cloudflare';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

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
			// Inline the small stylesheet so first paint doesn't wait for another request.
			inlineStyleThreshold: 32 * 1024,
			csp: {
				mode: 'hash',
				directives: {
					'default-src': ['self'],
					'script-src': ['self'],
					// SvelteKit's route announcer uses a style attribute, which hashes can't allow.
					// Scripts stay hash-locked; inline styles can't execute code.
					'style-src': ['self', 'unsafe-inline'],
					'img-src': ['self'],
					'font-src': ['self'],
					'connect-src': ['self'],
					'form-action': ['self'],
					'base-uri': ['none'],
					'object-src': ['none'],
					'frame-ancestors': ['none']
				}
			}
		})
	],
	build: {
		// Emit every asset as a hashed file instead of a data: URI, so the CSP can stay 'self'-only.
		assetsInlineLimit: 0
	}
});
