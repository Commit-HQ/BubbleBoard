import { error, json } from '@sveltejs/kit';
import { isPushEndpoint, vapidKey } from '$lib/server/push';
import { database, requireIdentity, sessionHash } from '$lib/server/session';
import { readJson } from '$lib/server/validate';
import type { RequestHandler } from './$types';

// Notifications on a connected device (src/lib/server/push.ts). A subscription belongs to the session that
// sent it, and the app sends its subscription whenever it opens, which moves it to the current session.

/** The public key devices subscribe with. */
export const GET: RequestHandler = async ({ platform }) => {
	const secret = platform?.env.VAPID_KEY;
	if (!secret) error(503, 'unavailable');
	return json({ key: (await vapidKey(secret)).publicKey });
};

export const PUT: RequestHandler = async (event) => {
	await requireIdentity(event);
	const { endpoint } = await readJson(event.request);
	if (!isPushEndpoint(endpoint)) error(400, 'invalid');
	await database(event)
		.prepare(
			`INSERT INTO push_subscriptions (endpoint, session_hash) VALUES (?1, ?2)
			ON CONFLICT (endpoint) DO UPDATE SET session_hash = ?2`
		)
		.bind(endpoint, (await sessionHash(event))!)
		.run();
	return new Response(null, { status: 204 });
};

/** Turns notifications off on this device. */
export const DELETE: RequestHandler = async (event) => {
	await requireIdentity(event);
	await database(event)
		.prepare('DELETE FROM push_subscriptions WHERE session_hash = ?')
		.bind((await sessionHash(event))!)
		.run();
	return new Response(null, { status: 204 });
};
