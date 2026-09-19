import { error, json } from '@sveltejs/kit';
import { isPushEndpoint, pushKey, subscribe, unsubscribe, vapidPublicKey } from '$lib/server/push';
import { database, requireIdentity, sessionHash } from '$lib/server/session';
import { readJson } from '$lib/server/validate';
import type { RequestHandler } from './$types';

// Notifications on a connected device (src/lib/server/push.ts). A subscription belongs to the session that
// sent it, and the app sends its subscription whenever it opens, which moves it to the current session.

/** The public key devices subscribe with. */
export const GET: RequestHandler = ({ platform }) => {
	const secret = platform?.env.VAPID_KEY;
	if (!secret) error(503, 'unavailable');
	return json({ key: vapidPublicKey(secret) });
};

export const PUT: RequestHandler = async (event) => {
	await requireIdentity(event);
	const { endpoint, p256dh, auth } = await readJson(event.request);
	if (!isPushEndpoint(endpoint)) error(400, 'invalid');
	// Missing or invalid keys leave that device's pushes empty.
	const device = { endpoint, p256dh: await pushKey(p256dh, 65), auth: await pushKey(auth, 16) };
	await subscribe(database(event), device, (await sessionHash(event))!);
	return new Response(null, { status: 204 });
};

/** Turns notifications off on this device. */
export const DELETE: RequestHandler = async (event) => {
	await requireIdentity(event);
	await unsubscribe(database(event), (await sessionHash(event))!);
	return new Response(null, { status: 204 });
};
