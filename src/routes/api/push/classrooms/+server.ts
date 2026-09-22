import { setMutedClassrooms } from '$lib/server/push';
import { database, requireHead } from '$lib/server/session';
import { classroomIds, readJson } from '$lib/server/validate';
import type { RequestHandler } from './$types';

// Which classrooms notify the head of the kindergarten. She's assigned to none, so she hears about them
// all until she says otherwise; the body names the ones she wants to hear about, and the server keeps the
// rest, which is what silences a classroom made later without anyone ticking it. A wanted classroom that's
// gone meanwhile is simply not among the rest, so it needs no answer of its own.
export const PUT: RequestHandler = async (event) => {
	const head = await requireHead(event);
	const wanted = classroomIds(await readJson(event.request));
	const db = database(event);
	const { results } = await db.prepare('SELECT id FROM classrooms').all<{ id: string }>();
	const muted = results.map(({ id }) => id).filter((id) => !wanted.includes(id));
	await setMutedClassrooms(db, head, muted);
	return new Response(null, { status: 204 });
};
