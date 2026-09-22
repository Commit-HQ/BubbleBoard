import { json } from '@sveltejs/kit';
import { renameFamily } from '$lib/server/catalog';
import { database, requireManager } from '$lib/server/session';
import { profile, readJson } from '$lib/server/validate';
import type { RequestHandler } from './$types';

export const PUT: RequestHandler = async (event) => {
	const manager = await requireManager(event);
	const changed = profile((await readJson(event.request)).profile);
	return json(await renameFamily(database(event), manager, event.params.id, changed));
};
