import { changeChild, removeChild } from '$lib/server/catalog';
import { database, requireAdmin } from '$lib/server/session';
import { childChange, childRemoval, readJson } from '$lib/server/validate';
import type { RequestHandler } from './$types';

export const PUT: RequestHandler = async (event) => {
	await requireAdmin(event);
	const change = childChange(await readJson(event.request));
	await changeChild(database(event), event.params.id, change);
	return new Response(null, { status: 204 });
};

export const DELETE: RequestHandler = async (event) => {
	await requireAdmin(event);
	const removal = childRemoval(await readJson(event.request));
	await removeChild(database(event), event.params.id, removal);
	return new Response(null, { status: 204 });
};
