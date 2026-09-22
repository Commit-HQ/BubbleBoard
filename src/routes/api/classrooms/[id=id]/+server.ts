import { json } from '@sveltejs/kit';
import { deleteClassroom, renameClassroom } from '$lib/server/catalog';
import { database, objectStore, requireHead } from '$lib/server/session';
import { profile, readJson } from '$lib/server/validate';
import type { RequestHandler } from './$types';

export const PUT: RequestHandler = async (event) => {
	const head = await requireHead(event);
	const changed = profile((await readJson(event.request)).profile);
	return json(await renameClassroom(database(event), head, event.params.id, changed));
};

/** Deletes a classroom without children, with its notices and board photo, and what they keep in R2. */
export const DELETE: RequestHandler = async (event) => {
	const head = await requireHead(event);
	const { bucket } = objectStore(event);
	return json(await deleteClassroom(database(event), bucket, head, event.params.id));
};
