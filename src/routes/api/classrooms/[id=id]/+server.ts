import { deleteClassroom, renameClassroom } from '$lib/server/catalog';
import { database, requireAdmin } from '$lib/server/session';
import { profile, readJson } from '$lib/server/validate';
import type { RequestHandler } from './$types';

export const PUT: RequestHandler = async (event) => {
	await requireAdmin(event);
	const body = await readJson(event.request);
	await renameClassroom(database(event), event.params.id, profile(body.profile));
	return new Response(null, { status: 204 });
};

export const DELETE: RequestHandler = async (event) => {
	await requireAdmin(event);
	await deleteClassroom(database(event), event.params.id);
	return new Response(null, { status: 204 });
};
