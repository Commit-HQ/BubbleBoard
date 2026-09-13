import { fileBytes, uploadFile } from '$lib/server/notices';
import { database, objectStore, requireIdentity, requireStaff } from '$lib/server/session';
import { readFile } from '$lib/server/validate';
import type { RequestHandler } from './$types';

// A notice's file: its encrypted bytes for everyone who sees the notice, and uploading them, for staff who
// post or change the notice, just before it's saved with the file in its content. An upload counts against
// the installation's storage limits.

export const GET: RequestHandler = async (event) => {
	const viewer = await requireIdentity(event);
	const { id, file } = event.params;
	return fileBytes(database(event), objectStore(event), viewer, id, file);
};

export const PUT: RequestHandler = async (event) => {
	const staff = await requireStaff(event);
	const bytes = await readFile(event.request);
	const { id, file } = event.params;
	await uploadFile(database(event), objectStore(event), staff, id, file, bytes);
	return new Response(null, { status: 204 });
};
