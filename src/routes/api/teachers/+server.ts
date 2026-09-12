import { json } from '@sveltejs/kit';
import { addTeacher } from '$lib/server/catalog';
import { database, requireAdmin } from '$lib/server/session';
import { newTeacher, readJson } from '$lib/server/validate';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async (event) => {
	const admin = await requireAdmin(event);
	const teacher = newTeacher(await readJson(event.request));
	return json(await addTeacher(database(event), admin, teacher));
};
