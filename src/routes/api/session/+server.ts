import { json } from '@sveltejs/kit';
import { accessFor } from '$lib/server/catalog';
import { database, endSession, requireIdentity } from '$lib/server/session';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
	const current = await requireIdentity(event);
	return json(await accessFor(database(event), current));
};

/** Signs this device out. The app has already deleted its keys; the session stops authorizing requests. */
export const DELETE: RequestHandler = async (event) => {
	await endSession(event);
	return new Response(null, { status: 204 });
};
