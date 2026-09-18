import { json } from '@sveltejs/kit';
import { inbox, startConversation } from '$lib/server/messages';
import { announceConversation } from '$lib/server/push';
import { database, requireIdentity, sessionHash } from '$lib/server/session';
import { id, readJson, sealed } from '$lib/server/validate';
import type { RequestHandler } from './$types';
export const GET: RequestHandler = async (event) =>
	json(await inbox(database(event), await requireIdentity(event)));
export const POST: RequestHandler = async (event) => {
	const who = await requireIdentity(event);
	const body = await readJson(event.request);
	const value = {
		id: id(body.id),
		classroom: id(body.classroom),
		family: id(body.family),
		title: sealed(body.title, 1000),
		message: id(body.message),
		content: sealed(body.content)
	};
	const inserted = await startConversation(database(event), who, value);
	if (inserted)
		event.platform?.ctx.waitUntil(announceConversation(event, value.id, await sessionHash(event)));
	return json({ id: value.id });
};
