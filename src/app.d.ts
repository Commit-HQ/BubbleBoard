// See https://svelte.dev/docs/kit/types#app.d.ts
declare global {
	namespace App {
		interface Platform {
			env: Env;
		}
	}

	// The setup token is a Worker secret, so generated types only list it when .dev.vars sets it.
	interface Env {
		SETUP_TOKEN: string;
	}
}

export {};
