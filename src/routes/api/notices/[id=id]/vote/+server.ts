import { json } from '@sveltejs/kit';
import { vote } from '$lib/server/notices';
import { database, requireFamily } from '$lib/server/session';
import { pollAnswer, readJson } from '$lib/server/validate';
import type { RequestHandler } from './$types';

// A family answers a notice's poll, or changes its answer, which also marks the notice as seen, and gets the
// board back as it sees it now. The answer is encrypted with the family's key, or with the poll's when families
// see its counts, so the server stores only that the family answered.
export const PUT: RequestHandler = async (event) => {
	const family = await requireFamily(event);
	const answer = pollAnswer(await readJson(event.request));
	return json(await vote(database(event), family, event.params.id, answer));
};
