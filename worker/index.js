// The Worker's entry point, `main` in wrangler.jsonc. SvelteKit's Cloudflare adapter builds only a fetch
// handler, which it writes where wrangler.build.jsonc says, so this adds the queue handler that sends
// notifications (src/lib/server/push.ts) and the daily cleanup (src/lib/server/cleanup.ts). It needs
// `npm run build` first.
import app from '../.svelte-kit/cloudflare/_worker.js';
import { cleanUp } from '../src/lib/server/cleanup.ts';
import { deliver } from '../src/lib/server/push.ts';

// Without invocation logs, an error is in Workers Logs only when it is written to the console, as SvelteKit
// does for a request's unexpected errors.
const logged = (promise) =>
	promise.catch((error) => {
		console.error(error);
		throw error;
	});

export default {
	fetch: (request, env, context) => app.fetch(request, env, context),
	queue: (batch, env) => logged(deliver(batch, env)),
	scheduled: (controller, env) => logged(cleanUp(env))
};
