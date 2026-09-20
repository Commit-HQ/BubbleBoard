import { json } from '@sveltejs/kit';
import { consents, saveConsent } from '$lib/server/events';
import { database, requireIdentity, requireFamily } from '$lib/server/session';
import { readJson, id, revision, sealed } from '$lib/server/validate';
import type { RequestHandler } from './$types';
export const GET: RequestHandler = async (event) => {
	const classroom = event.url.searchParams.get('classroom');
	return json(
		await consents(
			database(event),
			await requireIdentity(event),
			classroom ? id(classroom) : undefined
		)
	);
};
export const PUT: RequestHandler = async (event) => {
	const family = await requireFamily(event),
		b = await readJson(event.request);
	await saveConsent(
		database(event),
		family,
		id(b.child),
		revision(b.revision),
		sealed(b.choice, 256)
	);
	return new Response(null, { status: 204 });
};
