import { json } from '@sveltejs/kit';
import { postNotice } from '$lib/server/notices';
import { database, requireStaff } from '$lib/server/session';
import { newNotice, readJson } from '$lib/server/validate';
import type { RequestHandler } from './$types';

// Teachers post to their own classrooms, admins to any. The response is the board as the poster sees it.
export const POST: RequestHandler = async (event) => {
	const staff = await requireStaff(event);
	const notice = newNotice(await readJson(event.request));
	return json(await postNotice(database(event), staff, notice));
};
