import { json } from '@sveltejs/kit';
import { addChild } from '$lib/server/catalog';
import { database, requireManager } from '$lib/server/session';
import { newChild, readJson } from '$lib/server/validate';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async (event) => {
	const manager = await requireManager(event);
	const child = newChild(await readJson(event.request));
	return json(await addChild(database(event), manager, child));
};
