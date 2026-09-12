import { json } from '@sveltejs/kit';
import { renameFamily } from '$lib/server/catalog';
import { database, requireAdmin } from '$lib/server/session';
import { profile, readJson } from '$lib/server/validate';
import type { RequestHandler } from './$types';

export const PUT: RequestHandler = async (event) => {
	const admin = await requireAdmin(event);
	const changed = profile((await readJson(event.request)).profile);
	return json(await renameFamily(database(event), admin, event.params.id, changed));
};
