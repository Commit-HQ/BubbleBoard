import { setMutedClassrooms } from '$lib/server/push';
import { database, requireHead } from '$lib/server/session';
import { ids, readJson } from '$lib/server/validate';
import type { RequestHandler } from './$types';

// Which classrooms the head of the kindergarten hears nothing from. She's assigned to none, so she hears about
// every classroom she hasn't muted, and one made later speaks up until she mutes it too.
export const PUT: RequestHandler = async (event) => {
	const head = await requireHead(event);
	const muted = ids((await readJson(event.request)).muted);
	await setMutedClassrooms(database(event), head, muted);
	return new Response(null, { status: 204 });
};
