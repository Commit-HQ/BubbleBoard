import { replaceFamilyCard } from '$lib/server/catalog';
import { database, requireStaff } from '$lib/server/session';
import { newCredential, readJson } from '$lib/server/validate';
import type { RequestHandler } from './$types';

// Teachers can replace the cards of families in their classrooms, not only admins.
export const POST: RequestHandler = async (event) => {
	const staff = await requireStaff(event);
	const credential = newCredential(await readJson(event.request));
	await replaceFamilyCard(database(event), staff, event.params.id, credential);
	return new Response(null, { status: 204 });
};
