import { publishEvent, removeEvent } from '$lib/server/events';
import { database, objectStore, requireStaff, sessionHash } from '$lib/server/session';
import { readJson, ids, sealed, invalid, days } from '$lib/server/validate';
import { maxEventPhotos } from '$lib/events/limits';
import { maxEventContentBytes } from '$lib/events/types';
import { announce } from '$lib/server/push';
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
	if (result.published) await announce(event, [result.classroom], await sessionHash(event));
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
