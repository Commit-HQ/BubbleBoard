import { json } from '@sveltejs/kit';
import { orderInfoPages } from '$lib/server/info';
import { database, requireHead } from '$lib/server/session';
import { infoOrder, readJson } from '$lib/server/validate';
import type { RequestHandler } from './$types';

// The head puts the info pages in a new order, naming every page once, and the response is the info pages
// as she sees them now.
export const PUT: RequestHandler = async (event) => {
	const head = await requireHead(event);
	const pages = infoOrder(await readJson(event.request));
	return json(await orderInfoPages(database(event), head, pages));
};
