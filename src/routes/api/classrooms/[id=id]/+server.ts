import { json } from '@sveltejs/kit';
import { deleteClassroom, renameClassroom } from '$lib/server/catalog';
import { deletePhotosOf } from '$lib/server/photos';
import { database, photoBucket, requireAdmin } from '$lib/server/session';
import { profile, readJson } from '$lib/server/validate';
import type { RequestHandler } from './$types';

export const PUT: RequestHandler = async (event) => {
	const admin = await requireAdmin(event);
	const changed = profile((await readJson(event.request)).profile);
	return json(await renameClassroom(database(event), admin, event.params.id, changed));
};

/** Deletes a classroom without children, with its notices and its board photo. */
export const DELETE: RequestHandler = async (event) => {
	const admin = await requireAdmin(event);
	const records = await deleteClassroom(database(event), admin, event.params.id);
	await deletePhotosOf(photoBucket(event), event.params.id);
	return json(records);
};
