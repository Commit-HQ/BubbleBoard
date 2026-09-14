import { json } from '@sveltejs/kit';
import { orderInfoPages } from '$lib/server/info';
import { database, requireAdmin } from '$lib/server/session';
import { infoOrder, readJson } from '$lib/server/validate';
import type { RequestHandler } from './$types';

// Admins put the info pages in a new order, naming every page once, and the response is the info pages as they see
// them now.
export const PUT: RequestHandler = async (event) => {
	const admin = await requireAdmin(event);
	const pages = infoOrder(await readJson(event.request));
	return json(await orderInfoPages(database(event), admin, pages));
};
