import { infoFileBytes, uploadInfoFile } from '$lib/server/info';
import { database, objectStore, requireAdmin, requireIdentity } from '$lib/server/session';
import { readFile } from '$lib/server/validate';
import type { RequestHandler } from './$types';

// A file on the info page: its encrypted bytes for every connected device, and uploading them, for admins, just
// before they save the page with the file in its content. An upload counts against the installation's storage
// limits.

export const GET: RequestHandler = async (event) => {
	await requireIdentity(event);
	return infoFileBytes(database(event), objectStore(event), event.params.file);
};

export const PUT: RequestHandler = async (event) => {
	const admin = await requireAdmin(event);
	const bytes = await readFile(event.request);
	await uploadInfoFile(database(event), objectStore(event), admin, event.params.file, bytes);
	return new Response(null, { status: 204 });
};
