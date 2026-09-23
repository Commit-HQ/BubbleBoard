import { json } from '@sveltejs/kit';
import { database, requireIdentity, sessionHash } from '$lib/server/session';
import { readJson } from '$lib/server/validate';
import { changeMeeting } from '$lib/server/meetings';
import { announceMeetingChanges, notifyLater } from '$lib/server/push';
import type { RequestHandler } from './$types';
export const PUT: RequestHandler = async (event) => {
	const who = await requireIdentity(event),
		body = await readJson(event.request);
	const booking = await changeMeeting(database(event), who, event.params.id, body);
	// Withdrawing a free time tells no one: nobody had it.
	if (booking)
		notifyLater(event, announceMeetingChanges(event, [booking], await sessionHash(event)));
	return json({ ok: true });
};
