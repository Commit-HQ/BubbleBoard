import { changeTeacher, removeTeacher } from '$lib/server/catalog';
import { database, requireAdmin } from '$lib/server/session';
import { readJson, teacherChange } from '$lib/server/validate';
import type { RequestHandler } from './$types';

export const PUT: RequestHandler = async (event) => {
	await requireAdmin(event);
	const change = teacherChange(await readJson(event.request));
	await changeTeacher(database(event), event.params.id, change);
	return new Response(null, { status: 204 });
};

export const DELETE: RequestHandler = async (event) => {
	await requireAdmin(event);
	await removeTeacher(database(event), event.params.id);
	return new Response(null, { status: 204 });
};
