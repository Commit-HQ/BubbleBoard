import { json } from '@sveltejs/kit';
import { changeNotice, deleteNotice } from '$lib/server/notices';
import { announce } from '$lib/server/push';
import { database, objectStore, requireStaff, sessionHash } from '$lib/server/session';
import { noticeChange, readJson } from '$lib/server/validate';
import type { RequestHandler } from './$types';

// The author, the head, and the lead of every classroom it's for change or delete a notice, and each
// responds with the board as they see it. A
// change that announces the notice again notifies its families and teachers, as posting does. The files a
// change leaves out, or a deleted notice's, are deleted with it.
export const PUT: RequestHandler = async (event) => {
	const staff = await requireStaff(event);
	const change = noticeChange(await readJson(event.request));
	const { bucket } = objectStore(event);
	const board = await changeNotice(database(event), bucket, staff, event.params.id, change);
	if (change.announce) {
		const classrooms = change.classrooms.map(({ classroom }) => classroom);
		event.platform?.ctx.waitUntil(
			announce(event, classrooms, await sessionHash(event)).catch(() => {})
		);
	}
	return json(board);
};

export const DELETE: RequestHandler = async (event) => {
	const staff = await requireStaff(event);
	const { bucket } = objectStore(event);
	return json(await deleteNotice(database(event), bucket, staff, event.params.id));
};
