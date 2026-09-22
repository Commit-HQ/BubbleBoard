import { json } from '@sveltejs/kit';
import { changeInfoPage, deleteInfoPage } from '$lib/server/info';
import { database, objectStore, requireHead } from '$lib/server/session';
import { infoPageChange, readJson } from '$lib/server/validate';
import type { RequestHandler } from './$types';

// The head changes or deletes an info page, and each responds with the info pages as she sees them now. The
// files a change leaves out, or a deleted page's, are deleted with it. Neither notifies anyone.
export const PUT: RequestHandler = async (event) => {
	const head = await requireHead(event);
	const change = infoPageChange(await readJson(event.request));
	const { bucket } = objectStore(event);
	return json(await changeInfoPage(database(event), bucket, head, event.params.id, change));
};

export const DELETE: RequestHandler = async (event) => {
	const head = await requireHead(event);
	const { bucket } = objectStore(event);
	return json(await deleteInfoPage(database(event), bucket, head, event.params.id));
};
