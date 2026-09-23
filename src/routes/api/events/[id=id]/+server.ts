import { changeEvent, publishEvent, removeEvent } from '$lib/server/events';
import { database, objectStore, requireStaff, sessionHash } from '$lib/server/session';
import { readJson, ids, sealed, invalid, days, revision } from '$lib/server/validate';
import { maxEventPhotos } from '$lib/events/limits';
import { maxEventContentBytes } from '$lib/events/types';
import { announce, notifyLater } from '$lib/server/push';
import type { RequestHandler } from './$types';
export const PUT: RequestHandler = async (event) => {
	const staff = await requireStaff(event),
		b = await readJson(event.request);
	const files = ids(b.files, maxEventPhotos);
	if (!files.length) invalid();
	const result = await publishEvent(
		database(event),
		objectStore(event),
		staff,
		event.params.id,
		sealed(b.content, maxEventContentBytes),
		sealed(b.key, 256),
		files,
		days(b.days)
	);
	if (result.published)
		notifyLater(event, announce(event, [result.classroom], await sessionHash(event), 'photos'));
	return new Response(null, { status: 204 });
};
// Changing an event that's up: its words, its days, and which photos it holds. It doesn't notify anyone
// again, and the key its classroom opens it with stays the one it was published under.
export const PATCH: RequestHandler = async (event) => {
	const staff = await requireStaff(event),
		b = await readJson(event.request);
	await changeEvent(
		database(event),
		objectStore(event),
		staff,
		event.params.id,
		sealed(b.content, maxEventContentBytes),
		ids(b.files, maxEventPhotos),
		days(b.days),
		// Sent only by a device that prepared new photos: the catalog and consent it prepared them against.
		b.catalog === undefined
			? undefined
			: { catalog: revision(b.catalog), consent: revision(b.consent) }
	);
	return new Response(null, { status: 204 });
};
export const DELETE: RequestHandler = async (event) => {
	await removeEvent(
		database(event),
		objectStore(event),
		await requireStaff(event),
		event.params.id
	);
	return new Response(null, { status: 204 });
};
