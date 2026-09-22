import { json } from '@sveltejs/kit';
import { addClassroom } from '$lib/server/catalog';
import { database, requireHead } from '$lib/server/session';
import { newClassroom, readJson } from '$lib/server/validate';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async (event) => {
	const head = await requireHead(event);
	const classroom = newClassroom(await readJson(event.request));
	return json(await addClassroom(database(event), head, classroom));
};
