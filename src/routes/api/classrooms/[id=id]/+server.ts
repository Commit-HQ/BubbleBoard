import { json } from '@sveltejs/kit';
import { deleteClassroom, renameClassroom } from '$lib/server/catalog';
import { database, requireAdmin } from '$lib/server/session';
import { profile, readJson } from '$lib/server/validate';
import type { RequestHandler } from './$types';

export const PUT: RequestHandler = async (event) => {
	const admin = await requireAdmin(event);
	const changed = profile((await readJson(event.request)).profile);
	return json(await renameClassroom(database(event), admin, event.params.id, changed));
};

export const DELETE: RequestHandler = async (event) => {
	const admin = await requireAdmin(event);
	return json(await deleteClassroom(database(event), admin, event.params.id));
};
