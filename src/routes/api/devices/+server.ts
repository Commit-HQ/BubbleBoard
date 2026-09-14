import { json } from '@sveltejs/kit';
import { addOneTimeCard } from '$lib/server/catalog';
import { database, requireFamily } from '$lib/server/session';
import { newCredential, readJson } from '$lib/server/validate';
import type { RequestHandler } from './$types';

// A family's device adds another of the family's devices: it stores the one-time card that device connects with.
export const POST: RequestHandler = async (event) => {
	const family = await requireFamily(event);
	const credential = newCredential(await readJson(event.request));
	return json({ until: await addOneTimeCard(database(event), family, credential) });
};
