import { json } from '@sveltejs/kit';
import { photoBytes, putUpPhoto, takeDownPhoto } from '$lib/server/photos';
import { announce } from '$lib/server/push';
import {
	database,
	photoBucket,
	requireIdentity,
	requireStaff,
	sessionHash
} from '$lib/server/session';
import { readPhoto } from '$lib/server/validate';
import type { RequestHandler } from './$types';

// A classroom's board photo: its encrypted bytes for everyone who sees the classroom, and putting a new one
// up or taking it down for the classroom's teachers and admins, which responds with the board photos as they
// see them. A new photo notifies the classroom's families and teachers, as a new notice does.

export const GET: RequestHandler = async (event) => {
	const viewer = await requireIdentity(event);
	const { id, photo } = event.params;
	const body = await photoBytes(database(event), photoBucket(event), viewer, id, photo);
	return new Response(body, { headers: { 'content-type': 'application/octet-stream' } });
};

export const PUT: RequestHandler = async (event) => {
	const staff = await requireStaff(event);
	const bytes = await readPhoto(event.request);
	const { id, photo } = event.params;
	const photos = await putUpPhoto(database(event), photoBucket(event), staff, id, photo, bytes);
	await announce(event, [id], await sessionHash(event));
	return json(photos);
};

export const DELETE: RequestHandler = async (event) => {
	const staff = await requireStaff(event);
	const { id, photo } = event.params;
	return json(await takeDownPhoto(database(event), photoBucket(event), staff, id, photo));
};
