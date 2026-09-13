import { json } from '@sveltejs/kit';
import { changeNotice, deleteNotice } from '$lib/server/notices';
import { announce } from '$lib/server/push';
import { database, requireStaff, sessionHash } from '$lib/server/session';
import { noticeChange, readJson } from '$lib/server/validate';
import type { RequestHandler } from './$types';

// The author and admins change or delete a notice, and each responds with the board as they see it. A
// change that announces the notice again notifies its families and teachers, as posting does.
export const PUT: RequestHandler = async (event) => {
	const staff = await requireStaff(event);
	const change = noticeChange(await readJson(event.request));
	const board = await changeNotice(database(event), staff, event.params.id, change);
	if (change.announce) await announce(event, change.classrooms, await sessionHash(event));
	return json(board);
};

export const DELETE: RequestHandler = async (event) => {
	const staff = await requireStaff(event);
	return json(await deleteNotice(database(event), staff, event.params.id));
};
