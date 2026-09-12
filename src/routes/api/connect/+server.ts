import { error, json } from '@sveltejs/kit';
import { accessFor } from '$lib/server/catalog';
import { database, identityForCard, limitAttempts, startSession } from '$lib/server/session';
import { authToken, readJson } from '$lib/server/validate';
import type { RequestHandler } from './$types';

// Connects this device with a card's auth token. The card's secret and unlock key never leave the device.
export const POST: RequestHandler = async (event) => {
	await limitAttempts(event);
	const db = database(event);
	const card = await identityForCard(db, authToken((await readJson(event.request)).authToken));
	if (!card) error(401, 'unknown-card');
	await startSession(event, card.credential);
	return json(await accessFor(db, card));
};
