import { json } from '@sveltejs/kit';
import { saveInfo } from '$lib/server/info';
import { database, objectStore, requireAdmin } from '$lib/server/session';
import { infoChange, readJson } from '$lib/server/validate';
import type { RequestHandler } from './$types';

// Admins save the kindergarten's info page, and the response is the page as they see it now. Every connected
// device gets it with its session (catalog.ts), and saving it notifies no one. The files a save leaves out are
// deleted with it.
export const PUT: RequestHandler = async (event) => {
	const admin = await requireAdmin(event);
	const change = infoChange(await readJson(event.request));
	const { bucket } = objectStore(event);
	return json(await saveInfo(database(event), bucket, admin, change));
};
