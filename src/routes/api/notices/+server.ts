import { json } from '@sveltejs/kit';
import { postNotice } from '$lib/server/notices';
import { announce, notifyLater } from '$lib/server/push';
import { database, requireStaff, sessionHash } from '$lib/server/session';
import { newNotice, readJson } from '$lib/server/validate';
import type { RequestHandler } from './$types';

// Staff post to the classrooms they hold, the head to any. The notice's families and teachers get a
// notification, once, after the response, and the response is the board as the poster sees it.
export const POST: RequestHandler = async (event) => {
	const staff = await requireStaff(event);
	const notice = newNotice(await readJson(event.request));
	const { board, posted } = await postNotice(database(event), staff, notice);
	if (posted) {
		const classrooms = notice.classrooms.map(({ classroom }) => classroom);
		notifyLater(event, announce(event, classrooms, await sessionHash(event)));
	}
	return json(board);
};
