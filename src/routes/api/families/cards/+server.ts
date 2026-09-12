import { replaceFamilyCards } from '$lib/server/catalog';
import { database, requireStaff } from '$lib/server/session';
import { familyCards, readJson } from '$lib/server/validate';
import type { RequestHandler } from './$types';

// Teachers can replace the cards of families in their classrooms, not only admins.
export const POST: RequestHandler = async (event) => {
	const staff = await requireStaff(event);
	const cards = familyCards(await readJson(event.request));
	await replaceFamilyCards(database(event), staff, cards);
	return new Response(null, { status: 204 });
};
