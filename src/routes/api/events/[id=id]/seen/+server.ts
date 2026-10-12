import { markEventSeen } from '$lib/server/events';
import { database, requireFamily } from '$lib/server/session';
import type { RequestHandler } from './$types';

// A family marks an event it sees as seen, as it does a notice, which its teachers see. Marking it again
// changes nothing.
export const PUT: RequestHandler = async (event) => {
	await markEventSeen(database(event), await requireFamily(event), event.params.id);
	return new Response(null, { status: 204 });
};
