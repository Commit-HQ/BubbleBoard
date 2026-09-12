import { json } from '@sveltejs/kit';
import { addChild } from '$lib/server/catalog';
import { database, requireAdmin } from '$lib/server/session';
import { newChild, readJson } from '$lib/server/validate';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async (event) => {
	const admin = await requireAdmin(event);
	const child = newChild(await readJson(event.request));
	return json(await addChild(database(event), admin, child));
};
