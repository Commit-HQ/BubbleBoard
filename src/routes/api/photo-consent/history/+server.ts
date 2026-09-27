import { json } from '@sveltejs/kit';
import { consentHistory } from '$lib/server/events';
import { database, requireIdentity } from '$lib/server/session';
import { id } from '$lib/server/validate';
import type { RequestHandler } from './$types';
export const GET: RequestHandler = async (event) =>
	json(
		await consentHistory(
			database(event),
			await requireIdentity(event),
			id(event.url.searchParams.get('child'))
		)
	);
