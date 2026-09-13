import { error } from '@sveltejs/kit';
import type { Identity, PhotoRecord, Staff } from '$lib/api';
import { includesAll, transaction, visibleClassrooms } from './database';

// The photo of each classroom's board (docs/access-format.md): its encrypted bytes in private R2, and in the
// database which photo each classroom shows. The classroom's teachers and admins put a photo up in place of
// the one there, or take it down, and everyone who sees the classroom may fetch it. The server can't open a
// photo, so an object is named only by its classroom and the photo's random ID.

/** Where R2 keeps a board photo. Its classroom comes first, so a classroom's photos are found together. */
function objectKey(classroom: string, photo: string) {
	return `board/${classroom}/${photo}`;
}

/** The board photos someone sees: one for each of their classrooms that shows one. */
export async function boardPhotos(db: D1Database, viewer: Identity) {
	const [classrooms, params] = visibleClassrooms(viewer);
	const { results } = await db
		.prepare(
			`SELECT id, classroom_id AS classroom, posted_at AS postedAt FROM board_photos
			WHERE classroom_id IN (${classrooms}) ORDER BY posted_at DESC`
		)
		.bind(...params)
		.all<PhotoRecord>();
	return results;
}

/**
 * Refuses a classroom the staff member can't put photos up in: only their own, or any for an admin. A device
 * that offers another has records from before its teacher was moved, so it's told to load them again.
 */
async function checkClassroom(db: D1Database, staff: Staff, classroom: string) {
	if (!(await includesAll(db, [classroom], ...visibleClassrooms(staff)))) error(409, 'stale');
}

/**
 * Puts a photo up on a classroom's board in place of the one there, and returns the board photos as the
 * staff member sees them now. The bytes are stored before the database names them, and the photo they
 * replace is deleted once it no longer does. Putting the same photo up again, after a lost response, is fine.
 */
export async function putUpPhoto(
	db: D1Database,
	bucket: R2Bucket,
	staff: Staff,
	classroom: string,
	id: string,
	photo: Uint8Array<ArrayBuffer>
) {
	await checkClassroom(db, staff, classroom);
	await bucket.put(objectKey(classroom, id), photo);
	let replaced: string | undefined;
	try {
		// One transaction, so the photo read here is the one this change replaces.
		const [previous] = await transaction(db, [
			db.prepare('SELECT id FROM board_photos WHERE classroom_id = ?').bind(classroom),
			db
				.prepare(
					`INSERT INTO board_photos (classroom_id, id, posted_at) VALUES (?1, ?2, ?3)
					ON CONFLICT (classroom_id) DO UPDATE SET id = ?2, posted_at = ?3`
				)
				.bind(classroom, id, Date.now())
		]);
		replaced = (previous.results as { id: string }[])[0]?.id;
	} catch (cause) {
		// Unless an earlier try put this photo up, nothing names its bytes.
		const named = await db
			.prepare('SELECT 1 FROM board_photos WHERE classroom_id = ? AND id = ?')
			.bind(classroom, id)
			.first();
		if (!named) await bucket.delete(objectKey(classroom, id));
		throw cause;
	}
	if (replaced && replaced !== id) await bucket.delete(objectKey(classroom, replaced));
	return boardPhotos(db, staff);
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
	await checkClassroom(db, staff, classroom);
	const [{ meta }] = await transaction(db, [
		db.prepare('DELETE FROM board_photos WHERE classroom_id = ? AND id = ?').bind(classroom, id)
	]);
	if (!meta.changes) error(404, 'not-found');
	await bucket.delete(objectKey(classroom, id));
	return boardPhotos(db, staff);
}

/** A board photo's encrypted bytes, while it's up, for someone who sees its classroom. */
export async function photoBytes(
	db: D1Database,
	bucket: R2Bucket,
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
	const object = up && (await bucket.get(objectKey(classroom, id)));
	if (!object) error(404, 'not-found');
	return object.body;
}

/** Deletes what R2 keeps for a classroom that was deleted: its board photo. */
export async function deletePhotosOf(bucket: R2Bucket, classroom: string) {
	const { objects } = await bucket.list({ prefix: `board/${classroom}/` });
	if (objects.length) await bucket.delete(objects.map(({ key }) => key));
}
