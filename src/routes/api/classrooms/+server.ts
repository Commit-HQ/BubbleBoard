import { json } from '@sveltejs/kit';
import { addClassroom } from '$lib/server/catalog';
import { database, requireAdmin } from '$lib/server/session';
import { newClassroom, readJson } from '$lib/server/validate';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async (event) => {
	const admin = await requireAdmin(event);
	const classroom = newClassroom(await readJson(event.request));
	return json(await addClassroom(database(event), admin, classroom));
};
