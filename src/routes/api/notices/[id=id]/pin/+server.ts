import { json } from '@sveltejs/kit';
import { pinNotice } from '$lib/server/notices';
import { database, requireStaff } from '$lib/server/session';
import { flag, readJson } from '$lib/server/validate';
import type { RequestHandler } from './$types';

// Whoever may change a notice pins it to the top of the board or takes the pin out, and gets the board back
// as they see it now. Nobody is notified.
export const PUT: RequestHandler = async (event) => {
	const staff = await requireStaff(event);
	const { pinned } = await readJson(event.request);
	return json(await pinNotice(database(event), staff, event.params.id, flag(pinned)));
};
