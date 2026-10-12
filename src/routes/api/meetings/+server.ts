import { json } from '@sveltejs/kit';
import { database, requireIdentity, requireStaff, sessionHash } from '$lib/server/session';
import { readJson } from '$lib/server/validate';
import { changeMeetingTimes, meetingData, parseOffer, publishMeetings } from '$lib/server/meetings';
import { announce, notifyLater } from '$lib/server/push';
import type { RequestHandler } from './$types';
export const GET: RequestHandler = async (event) =>
	json(await meetingData(database(event), await requireIdentity(event)));
export const POST: RequestHandler = async (event) => {
	const who = await requireStaff(event),
		offer = parseOffer(await readJson(event.request));
	await publishMeetings(database(event), who, offer);
	notifyLater(event, announce(event, [offer.classroom], await sessionHash(event), 'slots'));
	return json({ ok: true });
};
// Changing a day's times tells no one: every booking stays where it was.
export const PUT: RequestHandler = async (event) => {
	await changeMeetingTimes(
		database(event),
		await requireStaff(event),
		await readJson(event.request)
	);
	return json({ ok: true });
};
