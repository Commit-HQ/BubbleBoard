import { error } from '@sveltejs/kit';
import type { InfoChange, InfoRecord, NewInfo, StaffInfoRecord } from '$lib/api';
import { transaction } from './database';
import type { Admin } from './session';
import { deleteMarked, getObject, putObject, type ObjectStore } from './storage';

// The kindergarten's info page (docs/access-format.md): text and files for everyone who uses the app, which admins
// save and which stays until they change it. The server can't read it, so it decides who may save it and fetch its
// files: admins save it, and every connected device reads it, staff with its Info Key wrapped for the Staff Key,
// and families with the copy each of their classrooms keeps (`classrooms.info_key`). The first save stores the key
// for staff and for every classroom, and a classroom added later brings its copy (catalog.ts), which the database
// checks (migrations/0013_info.sql). The page names the files it carries: their encrypted bytes are uploaded before
// it's saved, and deleted once it no longer names them.

/** Where R2 keeps a file of the page, as named_objects names it (migrations/). */
function fileKey(file: string) {
	return `info/${file}`;
}

const columns = 'content, edited_at AS editedAt';

function staffQuery(db: D1Database) {
	return db.prepare(`SELECT ${columns}, info_key_for_staff AS infoKeyForStaff FROM info`);
}

/** The page as staff get it, with its key for the Staff Key, or null before its first save. */
export function staffInfo(db: D1Database) {
	return staffQuery(db).first<StaffInfoRecord>();
}

/**
 * The page as families get it, or null before its first save. Their copies of its key come with their classrooms
 * (catalog.ts).
 */
export function familyInfo(db: D1Database) {
	return db.prepare(`SELECT ${columns} FROM info`).first<InfoRecord>();
}

/**
 * Saves the page for an admin, with the files its content holds, and returns it as staff get it now. The first save
 * stores the new Info Key for staff and for each classroom, and is refused when a page was saved first or a
 * classroom would be left without the key; a later save keeps the key, and is refused while there's no page. Either
 * way, the device is told to load its records again. The files a save leaves out are deleted.
 */
export async function saveInfo(
	db: D1Database,
	bucket: R2Bucket,
	admin: Admin,
	change: InfoChange | NewInfo
) {
	const now = Date.now();
	const page =
		'infoKeyForStaff' in change
			? [
					...change.classrooms.map(({ classroom, infoKey }) =>
						db.prepare('UPDATE classrooms SET info_key = ? WHERE id = ?').bind(infoKey, classroom)
					),
					db
						.prepare(
							'INSERT INTO info (id, content, info_key_for_staff, edited_at) VALUES (1, ?, ?, ?)'
						)
						.bind(change.content, change.infoKeyForStaff, now)
				]
			: [db.prepare('UPDATE info SET content = ?, edited_at = ?').bind(change.content, now)];
	const results = await transaction(db, [
		...page,
		// The files the save leaves out go on their way out with their rows.
		db
			.prepare('DELETE FROM info_files WHERE id NOT IN (SELECT value FROM json_each(?))')
			.bind(JSON.stringify(change.files)),
		// The database refuses a file that wasn't uploaded or is on its way out. Each file comes once (validate.ts).
		...change.files.map((file) =>
			db.prepare('INSERT INTO info_files (id) VALUES (?) ON CONFLICT DO NOTHING').bind(file)
		),
		staffQuery(db)
	]);
	await deleteMarked(db, bucket);
	const [record] = results[results.length - 1].results as StaffInfoRecord[];
	if (!record) error(409, 'stale');
	return record;
}

/**
 * Stores a file's encrypted bytes for the page, which names the file when an admin saves it. A file stored already
 * is refused as `stored`, and files the page never names are deleted in the daily cleanup a day later.
 */
export async function uploadInfoFile(
	db: D1Database,
	store: ObjectStore,
	admin: Admin,
	file: string,
	bytes: Uint8Array<ArrayBuffer>
) {
	await putObject(db, store, fileKey(file), bytes);
}

/** A file's encrypted bytes, while the page names it. Every connected device may fetch them. */
export async function infoFileBytes(db: D1Database, store: ObjectStore, file: string) {
	const named = await db.prepare('SELECT 1 FROM info_files WHERE id = ?').bind(file).first();
	if (!named) error(404, 'not-found');
	return getObject(db, store, fileKey(file));
}
