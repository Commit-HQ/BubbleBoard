import { error } from '@sveltejs/kit';
import type { Identity, PhotoRecord, Staff } from '$lib/api';
import { checkClassrooms, transaction, visibleClassrooms } from './database';
import { deleteMarked, getObject, putObject, type ObjectStore } from './storage';

// The photo of each classroom's board (docs/access-format.md): its encrypted bytes in private R2, and in the
// database which photo each classroom shows. The classroom's teachers and admins put a photo up in place of
// the one there, or take it down, and everyone who sees the classroom may fetch it. The server can't open a
// photo, so an object is named only by its classroom and the photo's random ID.

/** Where R2 keeps a board photo, as named_objects names it (migrations/). */
function objectKey(classroom: string, photo: string) {
	return `board/${classroom}/${photo}`;
}

/** The board photos someone sees: one for each of their classrooms that shows one. */
function photosQuery(db: D1Database, viewer: Identity) {
	const [classrooms, params] = visibleClassrooms(viewer);
	return db
		.prepare(
			`SELECT id, classroom_id AS classroom, posted_at AS postedAt FROM board_photos
			WHERE classroom_id IN (${classrooms}) ORDER BY posted_at DESC`
		)
		.bind(...params);
}

export async function boardPhotos(db: D1Database, viewer: Identity) {
	const { results } = await photosQuery(db, viewer).all<PhotoRecord>();
	return results;
}

/**
 * Puts a photo up on a classroom's board in place of the one there, and returns the board photos as the
 * staff member sees them now. The bytes are stored before the database names them, and the bytes of the
 * photo they replace are deleted once it's gone; bytes that didn't go up are deleted in the daily cleanup a
 * day later. A photo whose bytes are stored already is refused as `stored`.
 */
export async function putUpPhoto(
	db: D1Database,
	store: ObjectStore,
	staff: Staff,
	classroom: string,
	id: string,
	photo: Uint8Array<ArrayBuffer>,
	now = Date.now()
) {
	await checkClassrooms(db, staff, [classroom]);
	await putObject(db, store, objectKey(classroom, id), photo, now);
	const [, , photos] = await transaction(db, [
		db.prepare('DELETE FROM board_photos WHERE classroom_id = ?').bind(classroom),
		db
			.prepare('INSERT INTO board_photos (classroom_id, id, posted_at) VALUES (?, ?, ?)')
			.bind(classroom, id, now),
		photosQuery(db, staff)
	]);
	await deleteMarked(db, store.bucket);
	return photos.results as PhotoRecord[];
}

/**
 * Takes a classroom's photo down, if it's still the one there, and returns the board photos as the staff
 * member sees them now.
 */
export async function takeDownPhoto(
	db: D1Database,
	bucket: R2Bucket,
	staff: Staff,
	classroom: string,
	id: string
) {
	await checkClassrooms(db, staff, [classroom]);
	const [{ meta }, photos] = await transaction(db, [
		db.prepare('DELETE FROM board_photos WHERE classroom_id = ? AND id = ?').bind(classroom, id),
		photosQuery(db, staff)
	]);
	if (!meta.changes) error(404, 'not-found');
	await deleteMarked(db, bucket);
	return photos.results as PhotoRecord[];
}

/** A board photo's encrypted bytes, while it's up, for someone who sees its classroom. */
export async function photoBytes(
	db: D1Database,
	store: ObjectStore,
	viewer: Identity,
	classroom: string,
	id: string
) {
	const [classrooms, params] = visibleClassrooms(viewer);
	const up = await db
		.prepare(
			`SELECT 1 FROM board_photos WHERE classroom_id = ? AND id = ? AND classroom_id IN (${classrooms})`
		)
		.bind(classroom, id, ...params)
		.first();
	if (!up) error(404, 'not-found');
	return getObject(db, store, objectKey(classroom, id));
}
