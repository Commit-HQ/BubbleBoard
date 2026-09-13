// The Worker's entry point, `main` in wrangler.jsonc. SvelteKit's Cloudflare adapter builds only a fetch
// handler, which it writes where wrangler.build.jsonc says, so this adds the queue handler that sends
// notifications and the daily cleanup (src/lib/server/push.ts). It needs `npm run build` first.
import app from '../.svelte-kit/cloudflare/_worker.js';
import { cleanUp, deliver } from '../src/lib/server/push.ts';

export default {
	fetch: (request, env, context) => app.fetch(request, env, context),
	queue: (batch, env) => deliver(batch, env),
	scheduled: (controller, env) => cleanUp(env.DB)
};
