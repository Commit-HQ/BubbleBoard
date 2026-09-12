// See https://svelte.dev/docs/kit/types#app.d.ts
declare global {
	namespace App {
		interface Platform {
			env: Env;
		}
	}

	// The setup token and the key that signs notifications are Worker secrets, so generated types only list
	// them when .dev.vars sets them.
	interface Env {
		SETUP_TOKEN: string;
		VAPID_KEY: string;
	}
}

export {};
