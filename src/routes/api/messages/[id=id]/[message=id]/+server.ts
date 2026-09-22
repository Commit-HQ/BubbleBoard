import { deleteMessage, editMessage } from '$lib/server/messages';
import { database, objectStore, requireIdentity } from '$lib/server/session';
import { readJson, sealed } from '$lib/server/validate';
import type { RequestHandler } from './$types';

// One message of a private inquiry. Its author changes its words, and a teacher takes one of their own away.
// Neither is announced: a message that changes after it arrived is not news, and a device sees it the next
// time it opens the conversation.

/**
 * The new words of a message, sealed again as the same message: the envelope carries the files the message
 * already has, which the change never touches, so nothing about them is sent or accepted here.
 */
export const PUT: RequestHandler = async (event) => {
	const who = await requireIdentity(event);
	const body = await readJson(event.request);
	const { id, message } = event.params;
	await editMessage(database(event), who, id, message, sealed(body.content));
	return new Response(null, { status: 204 });
};

export const DELETE: RequestHandler = async (event) => {
	const who = await requireIdentity(event);
	const { id, message } = event.params;
	await deleteMessage(database(event), objectStore(event), who, id, message);
	return new Response(null, { status: 204 });
};
