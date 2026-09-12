import { replaceTeacherCard } from '$lib/server/catalog';
import { database, requireAdmin } from '$lib/server/session';
import { newCredential, readJson } from '$lib/server/validate';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async (event) => {
	await requireAdmin(event);
	const credential = newCredential(await readJson(event.request));
	await replaceTeacherCard(database(event), event.params.id, credential);
	return new Response(null, { status: 204 });
};
