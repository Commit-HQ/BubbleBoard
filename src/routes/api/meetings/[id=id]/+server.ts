import { json } from '@sveltejs/kit';
import { database, requireIdentity, sessionHash } from '$lib/server/session';
import { readJson } from '$lib/server/validate';
import { changeMeeting } from '$lib/server/meetings';
import { announceMeeting } from '$lib/server/push';
import type { RequestHandler } from './$types';
export const PUT: RequestHandler = async (event) => {
	const who = await requireIdentity(event),
		body = await readJson(event.request);
	const slot = await changeMeeting(database(event), who, event.params.id, body);
	if (body.action !== 'remove') {
		const task = announceMeeting(
			event,
			slot.offer,
			body.action === 'book' ? String(body.child) : slot.child!,
			await sessionHash(event)
		).catch(() => {});
		await task;
	}
	return json({ ok: true });
};
