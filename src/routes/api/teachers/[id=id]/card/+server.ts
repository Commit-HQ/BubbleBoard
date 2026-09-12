import { json } from '@sveltejs/kit';
import { replaceTeacherCard } from '$lib/server/catalog';
import { database, requireAdmin } from '$lib/server/session';
import { newCredential, readJson } from '$lib/server/validate';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async (event) => {
	const admin = await requireAdmin(event);
	const credential = newCredential(await readJson(event.request));
	return json(await replaceTeacherCard(database(event), admin, event.params.id, credential));
};
