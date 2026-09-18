import { json } from '@sveltejs/kit';
import { database, requireIdentity, requireStaff, sessionHash } from '$lib/server/session';
import { readJson } from '$lib/server/validate';
import { meetingData, parseOffer, publishMeetings } from '$lib/server/meetings';
import { announce } from '$lib/server/push';
import type { RequestHandler } from './$types';
export const GET: RequestHandler = async (event) =>
	json(await meetingData(database(event), await requireIdentity(event)));
export const POST: RequestHandler = async (event) => {
	const who = await requireStaff(event),
		offer = parseOffer(await readJson(event.request));
	await publishMeetings(database(event), who, offer);
	const task = announce(event, [offer.classroom], await sessionHash(event), 'slots').catch(
		() => {}
	);
	await task;
	return json({ ok: true });
};
