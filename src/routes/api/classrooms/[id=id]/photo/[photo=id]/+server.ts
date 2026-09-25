import { json } from '@sveltejs/kit';
import { photoBytes, putUpPhoto, takeDownPhoto } from '$lib/server/photos';
import { announce, notifyLater } from '$lib/server/push';
import {
	database,
	objectStore,
	requireIdentity,
	requireStaff,
	sessionHash
} from '$lib/server/session';
import { photoDetails, readPhoto } from '$lib/server/validate';
import type { RequestHandler } from './$types';

// A classroom's board photo: its encrypted bytes for everyone who sees the classroom, and putting a new one
// up or taking it down for the classroom's staff and the head, which responds with the board photos as they
// see them. A new photo's details, who put it up, come encrypted in a header beside its bytes. It counts
// against the installation's storage limits and notifies the classroom's families and teachers.

export const GET: RequestHandler = async (event) => {
	const viewer = await requireIdentity(event);
	const { id, photo } = event.params;
	return photoBytes(database(event), objectStore(event), viewer, id, photo);
};

export const PUT: RequestHandler = async (event) => {
	const staff = await requireStaff(event);
	const details = photoDetails(event.request);
	const bytes = await readPhoto(event.request);
	const { id, photo } = event.params;
	const store = objectStore(event);
	const photos = await putUpPhoto(database(event), store, staff, id, photo, bytes, details);
	notifyLater(event, announce(event, [id], await sessionHash(event), 'corkboard'));
	return json(photos);
};

export const DELETE: RequestHandler = async (event) => {
	const staff = await requireStaff(event);
	const { id, photo } = event.params;
	const { bucket } = objectStore(event);
	return json(await takeDownPhoto(database(event), bucket, staff, id, photo));
};
