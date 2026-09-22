import { json } from '@sveltejs/kit';
import { addTeacher } from '$lib/server/catalog';
import { database, requireHead } from '$lib/server/session';
import { newTeacher, readJson } from '$lib/server/validate';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async (event) => {
	const head = await requireHead(event);
	const teacher = newTeacher(await readJson(event.request));
	return json(await addTeacher(database(event), head, teacher));
};
