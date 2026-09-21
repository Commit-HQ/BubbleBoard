import { eventFile, uploadEventFile } from '$lib/server/events';
import { database, objectStore, requireIdentity, requireStaff } from '$lib/server/session';
import { readEventPhoto } from '$lib/server/validate';
import type { RequestHandler } from './$types';
export const GET: RequestHandler = async (event) =>
	eventFile(
		database(event),
		objectStore(event),
		await requireIdentity(event),
		event.params.id,
		event.params.file
	);
export const PUT: RequestHandler = async (event) => {
	const staff = await requireStaff(event);
	await uploadEventFile(
		database(event),
		objectStore(event),
		staff,
		event.params.id,
		event.params.file,
		await readEventPhoto(event.request)
	);
	return new Response(null, { status: 204 });
};
