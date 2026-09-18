import { error, json } from '@sveltejs/kit';
import { closeConversation, markRead, readMessages, reply } from '$lib/server/messages';
import { announceConversation } from '$lib/server/push';
import { database, requireIdentity, sessionHash } from '$lib/server/session';
import { id, readJson, sealed } from '$lib/server/validate';
import type { RequestHandler } from './$types';
export const GET: RequestHandler = async (event) => {
	const who = await requireIdentity(event);
	const before = event.url.searchParams.has('before')
		? Number(event.url.searchParams.get('before'))
		: Number.MAX_SAFE_INTEGER;
	if (!Number.isSafeInteger(before) || before < 1) error(400, 'invalid');
	return json(await readMessages(database(event), who, event.params.id, before));
};
export const POST: RequestHandler = async (event) => {
	const who = await requireIdentity(event);
	const body = await readJson(event.request);
	const inserted = await reply(
		database(event),
		who,
		event.params.id,
		id(body.id),
		sealed(body.content)
	);
	if (inserted)
		event.platform?.ctx.waitUntil(
			announceConversation(event, event.params.id, await sessionHash(event))
		);
	return new Response(null, { status: 204 });
};
export const PUT: RequestHandler = async (event) => {
	const who = await requireIdentity(event);
	const body = await readJson(event.request);
	if (body.action === 'close') await closeConversation(database(event), who, event.params.id);
	else if (
		body.action === 'read' &&
		Number.isSafeInteger(body.sequence) &&
		Number(body.sequence) > 0
	)
		await markRead(database(event), who, event.params.id, body.sequence as number);
	else error(400, 'invalid');
	return new Response(null, { status: 204 });
};
