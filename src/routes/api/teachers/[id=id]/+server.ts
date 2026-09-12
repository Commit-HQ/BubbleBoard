import { json } from '@sveltejs/kit';
import { changeTeacher, removeTeacher } from '$lib/server/catalog';
import { database, requireAdmin } from '$lib/server/session';
import { readJson, teacherChange } from '$lib/server/validate';
import type { RequestHandler } from './$types';

export const PUT: RequestHandler = async (event) => {
	const admin = await requireAdmin(event);
	const change = teacherChange(await readJson(event.request));
	return json(await changeTeacher(database(event), admin, event.params.id, change));
};

export const DELETE: RequestHandler = async (event) => {
	const admin = await requireAdmin(event);
	return json(await removeTeacher(database(event), admin, event.params.id));
};
