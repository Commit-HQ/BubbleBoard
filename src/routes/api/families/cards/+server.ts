import { replaceFamilyCards } from '$lib/server/catalog';
import { database, requireAdmin } from '$lib/server/session';
import { familyCards, readJson } from '$lib/server/validate';
import type { RequestHandler } from './$types';

// Family cards can grant access across classrooms; only admins replace them.
export const POST: RequestHandler = async (event) => {
	const staff = await requireAdmin(event);
	const cards = familyCards(await readJson(event.request));
	await replaceFamilyCards(database(event), staff, cards);
	return new Response(null, { status: 204 });
};
