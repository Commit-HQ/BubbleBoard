import { json } from '@sveltejs/kit';
import { changeTeacher, removeTeacher } from '$lib/server/catalog';
import { database, requireHead } from '$lib/server/session';
import { readJson, teacherChange } from '$lib/server/validate';
import type { RequestHandler } from './$types';

export const PUT: RequestHandler = async (event) => {
	const head = await requireHead(event);
	const change = teacherChange(await readJson(event.request));
	return json(await changeTeacher(database(event), head, event.params.id, change));
};

export const DELETE: RequestHandler = async (event) => {
	const head = await requireHead(event);
	return json(await removeTeacher(database(event), head, event.params.id));
};
