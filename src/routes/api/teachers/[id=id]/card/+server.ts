import { json } from '@sveltejs/kit';
import { replaceTeacherCard } from '$lib/server/catalog';
import { database, requireHead } from '$lib/server/session';
import { newCredential, readJson } from '$lib/server/validate';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async (event) => {
	const head = await requireHead(event);
	const credential = newCredential(await readJson(event.request));
	return json(await replaceTeacherCard(database(event), head, event.params.id, credential));
};
