import { infoFileBytes, uploadInfoFile } from '$lib/server/info';
import { database, objectStore, requireAdmin, requireIdentity } from '$lib/server/session';
import { readFile } from '$lib/server/validate';
import type { RequestHandler } from './$types';

// A file on an info page: its encrypted bytes for every connected device, and uploading them, for admins, just
// before they save the page with the file in its content. An upload counts against the installation's storage
// limits.

export const GET: RequestHandler = async (event) => {
	await requireIdentity(event);
	const { id, file } = event.params;
	return infoFileBytes(database(event), objectStore(event), id, file);
};

export const PUT: RequestHandler = async (event) => {
	const admin = await requireAdmin(event);
	const bytes = await readFile(event.request);
	const { id, file } = event.params;
	await uploadInfoFile(database(event), objectStore(event), admin, id, file, bytes);
	return new Response(null, { status: 204 });
};
