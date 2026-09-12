import { addChild } from '$lib/server/catalog';
import { database, requireAdmin } from '$lib/server/session';
import { newChild, readJson } from '$lib/server/validate';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async (event) => {
	await requireAdmin(event);
	await addChild(database(event), newChild(await readJson(event.request)));
	return new Response(null, { status: 204 });
};
