import { json } from '@sveltejs/kit';
import { addInfoPage } from '$lib/server/info';
import { database, requireAdmin } from '$lib/server/session';
import { newInfoPage, readJson } from '$lib/server/validate';
import type { RequestHandler } from './$types';

// Admins add a page to the kindergarten's info, after the others, and the response is the info pages as they see
// them now. Every connected device gets the pages with its session (catalog.ts), and adding one notifies no one.
export const POST: RequestHandler = async (event) => {
	const admin = await requireAdmin(event);
	const page = newInfoPage(await readJson(event.request));
	return json(await addInfoPage(database(event), admin, page));
};
