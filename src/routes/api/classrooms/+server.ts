import { addClassroom } from '$lib/server/catalog';
import { database, requireAdmin } from '$lib/server/session';
import { newClassroom, readJson } from '$lib/server/validate';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async (event) => {
	await requireAdmin(event);
	await addClassroom(database(event), newClassroom(await readJson(event.request)));
	return new Response(null, { status: 204 });
};
