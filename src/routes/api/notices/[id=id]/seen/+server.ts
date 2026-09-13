import { json } from '@sveltejs/kit';
import { markSeen } from '$lib/server/notices';
import { database, requireFamily } from '$lib/server/session';
import type { RequestHandler } from './$types';

// A family marks a notice it sees as seen, which its teachers see, and gets the board back as it sees it now.
// Marking it again changes nothing.
export const PUT: RequestHandler = async (event) => {
	const family = await requireFamily(event);
	return json(await markSeen(database(event), family, event.params.id));
};
