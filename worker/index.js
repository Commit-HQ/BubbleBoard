// The Worker's entry point, `main` in wrangler.jsonc. SvelteKit's Cloudflare adapter builds only a fetch
// handler, which it writes where wrangler.build.jsonc says, so this adds the queue handler that sends
// notifications (src/lib/server/push.ts), the daily cleanup (src/lib/server/cleanup.ts), and the reminders
// of tomorrow's meetings (wrangler.jsonc says when each runs). It also answers the byte ranges of the
// landing page's tour videos, the only static files it sees (src/lib/server/ranges.ts), whose sizes the
// build writes down (vite.config.ts). It needs `npm run build` first.
import app from '../.svelte-kit/cloudflare/_worker.js';
import videoSizes from '../.svelte-kit/video-sizes.json';
import { cleanUp } from '../src/lib/server/cleanup.ts';
import { deliver, remindMeetings } from '../src/lib/server/push.ts';
import { serveRange } from '../src/lib/server/ranges.ts';

// Without invocation logs, an error is in Workers Logs only when it is written to the console, as SvelteKit
// does for a request's unexpected errors.
const logged = (promise) =>
	promise.catch((error) => {
		console.error(error);
		throw error;
	});

// The second schedule in wrangler.jsonc.
const reminders = '0 15 * * *';

// The size of a tour video a request reads, which `run_worker_first` in wrangler.jsonc sends here rather than
// to the static assets.
const sizeOf = (request) =>
	request.method === 'GET' || request.method === 'HEAD'
		? videoSizes[new URL(request.url).pathname]
		: undefined;

export default {
	fetch: (request, env, context) => {
		const size = sizeOf(request);
		return size === undefined
			? app.fetch(request, env, context)
			: serveRange(request, env.ASSETS, size);
	},
	queue: (batch, env) => logged(deliver(batch, env)),
	scheduled: (controller, env) =>
		logged(controller.cron === reminders ? remindMeetings(env) : cleanUp(env))
};
