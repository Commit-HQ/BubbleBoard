import { addTeacher } from '$lib/server/catalog';
import { database, requireAdmin } from '$lib/server/session';
import { newTeacher, readJson } from '$lib/server/validate';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async (event) => {
	await requireAdmin(event);
	await addTeacher(database(event), newTeacher(await readJson(event.request)));
	return new Response(null, { status: 204 });
};
