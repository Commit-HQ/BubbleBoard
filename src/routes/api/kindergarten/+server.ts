import { json } from '@sveltejs/kit';
import { kindergarten } from '$lib/server/catalog';
import { database, requireStaff } from '$lib/server/session';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
	const staff = await requireStaff(event);
	return json(await kindergarten(database(event), staff));
};
