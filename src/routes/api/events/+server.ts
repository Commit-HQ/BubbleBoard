import { json } from '@sveltejs/kit';
import { events, startEvent } from '$lib/server/events';
import { database, requireIdentity, requireStaff } from '$lib/server/session';
import { readJson, id, revision } from '$lib/server/validate';
import type { RequestHandler } from './$types';
export const GET: RequestHandler = async (event) =>
	json(await events(database(event), await requireIdentity(event)));
export const POST: RequestHandler = async (event) => {
	const staff = await requireStaff(event),
		b = await readJson(event.request);
	await startEvent(
		database(event),
		staff,
		id(b.id),
		id(b.classroom),
		revision(b.catalog),
		revision(b.consent)
	);
	return new Response(null, { status: 204 });
};
