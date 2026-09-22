import { error } from '@sveltejs/kit';
import { setUp } from '$lib/server/catalog';
import { database, isSetupToken, limitAttempts, startSession } from '$lib/server/session';
import { readJson, setup } from '$lib/server/validate';
import type { RequestHandler } from './$types';

// The first setup, allowed by the installation's setup token (README). It stores the first head's card and
// the recovery card, both heads, and connects this device with the head's card.
export const POST: RequestHandler = async (event) => {
	await limitAttempts(event);
	const { token, teachers } = setup(await readJson(event.request));
	if (!(await isSetupToken(event, token))) error(403, 'wrong-setup-token');
	await setUp(database(event), teachers);
	await startSession(event, teachers[0].credential.id);
	return new Response(null, { status: 204 });
};
