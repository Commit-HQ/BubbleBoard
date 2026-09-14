import { json } from '@sveltejs/kit';
import { changeInfoPage, deleteInfoPage } from '$lib/server/info';
import { database, objectStore, requireAdmin } from '$lib/server/session';
import { infoPageChange, readJson } from '$lib/server/validate';
import type { RequestHandler } from './$types';

// Admins change or delete an info page, and each responds with the info pages as they see them now. The files a
// change leaves out, or a deleted page's, are deleted with it. Neither notifies anyone.
export const PUT: RequestHandler = async (event) => {
	const admin = await requireAdmin(event);
	const change = infoPageChange(await readJson(event.request));
	const { bucket } = objectStore(event);
	return json(await changeInfoPage(database(event), bucket, admin, event.params.id, change));
};

export const DELETE: RequestHandler = async (event) => {
	const admin = await requireAdmin(event);
	const { bucket } = objectStore(event);
	return json(await deleteInfoPage(database(event), bucket, admin, event.params.id));
};
