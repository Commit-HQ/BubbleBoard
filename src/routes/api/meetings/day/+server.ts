import { json } from '@sveltejs/kit';
import { database, requireStaff, sessionHash } from '$lib/server/session';
import { readJson } from '$lib/server/validate';
import { removeMeetingDay } from '$lib/server/meetings';
import { announceMeetingChanges } from '$lib/server/push';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async (event) => {
	const staff = await requireStaff(event);
	const removed = await removeMeetingDay(database(event), staff, await readJson(event.request));
	const poster = await sessionHash(event);
	await announceMeetingChanges(
		event,
		removed.flatMap((slot) => (slot.child ? [{ offer: slot.offer, child: slot.child }] : [])),
		poster
	).catch(() => {});

	return json({ ok: true });
};
