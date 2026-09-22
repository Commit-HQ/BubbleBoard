import { replaceFamilyCards } from '$lib/server/catalog';
import { database, requireManager } from '$lib/server/session';
import { familyCards, readJson } from '$lib/server/validate';
import type { RequestHandler } from './$types';

// Family cards can grant access across classrooms, so the head and the leads of the classrooms a family
// reaches replace them.
export const POST: RequestHandler = async (event) => {
	const manager = await requireManager(event);
	const cards = familyCards(await readJson(event.request));
	await replaceFamilyCards(database(event), manager, cards);
	return new Response(null, { status: 204 });
};
