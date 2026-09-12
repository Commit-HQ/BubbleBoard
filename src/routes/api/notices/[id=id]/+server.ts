import { json } from '@sveltejs/kit';
import { changeNotice, deleteNotice } from '$lib/server/notices';
import { database, requireStaff } from '$lib/server/session';
import { noticeChange, readJson } from '$lib/server/validate';
import type { RequestHandler } from './$types';

// The author and admins change or delete a notice. Each responds with the board as they see it.
export const PUT: RequestHandler = async (event) => {
	const staff = await requireStaff(event);
	const change = noticeChange(await readJson(event.request));
	return json(await changeNotice(database(event), staff, event.params.id, change));
};

export const DELETE: RequestHandler = async (event) => {
	const staff = await requireStaff(event);
	return json(await deleteNotice(database(event), staff, event.params.id));
};
