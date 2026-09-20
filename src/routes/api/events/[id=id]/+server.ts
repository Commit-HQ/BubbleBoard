import { json } from '@sveltejs/kit';
import { publishEvent, removeEvent } from '$lib/server/events';
import { database, objectStore, requireStaff, sessionHash } from '$lib/server/session';
import { readJson, ids, sealed, invalid } from '$lib/server/validate';
import { noticeDays } from '$lib/notices';
import { announce } from '$lib/server/push';
import type { RequestHandler } from './$types';
export const PUT: RequestHandler = async (event) => {
	const staff = await requireStaff(event),
		b = await readJson(event.request);
	const files = ids(b.files, 20);
	if (!files.length || !noticeDays.includes(b.days as 30)) invalid();
	const result = await publishEvent(
		database(event),
		objectStore(event),
		staff,
		event.params.id,
		sealed(b.content, 32000),
		sealed(b.key, 256),
		files,
		b.days as number
	);
	if (result.published) await announce(event, [result.classroom], await sessionHash(event));
	return json({ published: true });
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
