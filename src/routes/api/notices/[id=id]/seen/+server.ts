import { markSeen } from '$lib/server/notices';
import { database, requireFamily } from '$lib/server/session';
import type { RequestHandler } from './$types';

// A family marks a notice it sees as seen, which its teachers see. Marking it again changes nothing.
export const PUT: RequestHandler = async (event) => {
	const family = await requireFamily(event);
	await markSeen(database(event), family, event.params.id);
	return new Response(null, { status: 204 });
};
