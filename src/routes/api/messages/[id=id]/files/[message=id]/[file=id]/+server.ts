import { messageFileBytes, uploadMessageFile } from '$lib/server/messages';
import { database, objectStore, requireIdentity } from '$lib/server/session';
import { readFile } from '$lib/server/validate';
import type { RequestHandler } from './$types';

// A file attached to a message of a private inquiry: its encrypted bytes for the family and the classroom's
// teachers, and uploading them, for staff, just before the message that names the file is sent. An upload
// counts against the installation's storage limits.

export const GET: RequestHandler = async (event) => {
	const who = await requireIdentity(event);
	const { id, message, file } = event.params;
	return messageFileBytes(database(event), objectStore(event), who, id, message, file);
};

export const PUT: RequestHandler = async (event) => {
	const who = await requireIdentity(event);
	const bytes = await readFile(event.request);
	const { id, message, file } = event.params;
	await uploadMessageFile(database(event), objectStore(event), who, id, message, file, bytes);
	return new Response(null, { status: 204 });
};
