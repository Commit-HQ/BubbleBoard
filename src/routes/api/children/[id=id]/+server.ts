import { json } from '@sveltejs/kit';
import { changeChild, removeChild } from '$lib/server/catalog';
import { database, requireAdmin } from '$lib/server/session';
import { childChange, familyLinks, readJson } from '$lib/server/validate';
import type { RequestHandler } from './$types';

export const PUT: RequestHandler = async (event) => {
	const admin = await requireAdmin(event);
	const change = childChange(await readJson(event.request));
	return json(await changeChild(database(event), admin, event.params.id, change));
};

export const DELETE: RequestHandler = async (event) => {
	const admin = await requireAdmin(event);
	const links = familyLinks(await readJson(event.request));
	return json(await removeChild(database(event), admin, event.params.id, links));
};
