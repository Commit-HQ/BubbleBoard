import { error } from '@sveltejs/kit';
import type { InfoPageChange, InfoPageRecord, NewInfoPage, StaffInfo } from '$lib/api';
import { maxInfoPages } from '$lib/info';
import { transaction } from './database';
import type { Head } from './session';
import { deleteMarked, getObject, putObject, type ObjectStore } from './storage';

// The kindergarten's info pages (docs/access-format.md): text and files for everyone who uses the app, in the order
// the head put them in, which stay until she changes or deletes them. The server can't read them, so it decides who
// may change them and fetch their files: the head adds, changes, orders, and deletes pages, and every connected device
// reads them, staff with the Info Key wrapped for the Staff Key, and families with the copy each of their classrooms
// keeps (`classrooms.info_key`). The first page brings the key for staff and for every classroom, and a classroom
// added later brings its copy (catalog.ts), which the database checks (migrations/0013_info.sql). A page names the
// files it carries: their encrypted bytes are uploaded before it's saved, and deleted once it no longer names them.

/** Where R2 keeps a page's file, as named_objects names it (migrations/). */
function fileKey(page: string, file: string) {
	return `info/${page}/${file}`;
}

/** The pages, in the order the head put them in. */
function pagesQuery(db: D1Database) {
	return db.prepare(
		'SELECT id, content, edited_at AS editedAt FROM info_pages ORDER BY position, id'
	);
}

function keyQuery(db: D1Database) {
	return db.prepare('SELECT info_key_for_staff AS infoKeyForStaff FROM info');
}

/** The Info Key's and the pages' rows, as staff get them. */
function readStaffInfo(key: D1Result, pages: D1Result): StaffInfo {
	const [row] = key.results as { infoKeyForStaff: string }[];
	return {
		infoKeyForStaff: row?.infoKeyForStaff ?? null,
		pages: pages.results as InfoPageRecord[]
	};
}

/** The pages as staff get them, with the Info Key wrapped for the Staff Key once the first page brought it. */
export async function staffInfo(db: D1Database) {
	const [key, pages] = await db.batch([keyQuery(db), pagesQuery(db)]);
	return readStaffInfo(key, pages);
}

/** The pages as families get them. Their copies of the Info Key come with their classrooms (catalog.ts). */
export async function familyInfo(db: D1Database) {
	const { results } = await pagesQuery(db).all<InfoPageRecord>();
	return { pages: results };
}

/**
 * Changes the pages and reads them back as staff get them now, in one transaction, with the results of the change's
 * own statements.
 */
async function changeInfo(db: D1Database, statements: D1PreparedStatement[]) {
	const results = await transaction(db, [...statements, keyQuery(db), pagesQuery(db)]);
	const [key, pages] = results.slice(statements.length);
	return { results, info: readStaffInfo(key, pages) };
}

/**
 * Names a page's files, keeping those it names already. The database refuses a file that wasn't uploaded for the
 * page or is on its way out (migrations/0014_info_pages.sql). Each file comes once (validate.ts).
 */
function insertFiles(db: D1Database, page: string, files: string[]) {
	return files.map((file) =>
		db
			.prepare('INSERT INTO info_files (page_id, id) VALUES (?, ?) ON CONFLICT DO NOTHING')
			.bind(page, file)
	);
}

/**
 * Adds a page for the head, after the others, with the files its content holds. The kindergarten's first page brings
 * the new Info Key for staff and for each classroom, and is refused when another page brought a key first or a
 * classroom would be left without it; any other page is refused when it brings a key, or comes before there's one.
 * Either way, the device is told to load its records again.
 */
export async function addInfoPage(db: D1Database, head: Head, page: NewInfoPage) {
	const row = await db
		.prepare(
			'SELECT COUNT(*) AS count, EXISTS (SELECT 1 FROM info_pages WHERE id = ?) AS added FROM info_pages'
		)
		.bind(page.id)
		.first<{ count: number; added: number }>();
	// A page added already, sent again because the answer never reached her device, is left as it is.
	if (row?.added) return staffInfo(db);
	if ((row?.count ?? 0) >= maxInfoPages) error(409, 'too-many-pages');
	const key = page.key
		? [
				...page.key.classrooms.map(({ classroom, infoKey }) =>
					db.prepare('UPDATE classrooms SET info_key = ? WHERE id = ?').bind(infoKey, classroom)
				),
				db
					.prepare('INSERT INTO info (id, info_key_for_staff) VALUES (1, ?)')
					.bind(page.key.infoKeyForStaff)
			]
		: [];
	const { info } = await changeInfo(db, [
		...key,
		db
			.prepare(
				`INSERT INTO info_pages (id, content, position, edited_at)
				VALUES (?1, ?2, (SELECT COALESCE(MAX(position), 0) + 1 FROM info_pages), ?3)`
			)
			.bind(page.id, page.content, Date.now()),
		...insertFiles(db, page.id, page.files)
	]);
	return info;
}

/** Changes a page for the head, and deletes the files the change leaves out. */
export async function changeInfoPage(
	db: D1Database,
	bucket: R2Bucket,
	head: Head,
	id: string,
	change: InfoPageChange
) {
	const { results, info } = await changeInfo(db, [
		db
			.prepare('UPDATE info_pages SET content = ?, edited_at = ? WHERE id = ?')
			.bind(change.content, Date.now(), id),
		// The files the change leaves out go on their way out with their rows.
		db
			.prepare(
				'DELETE FROM info_files WHERE page_id = ? AND id NOT IN (SELECT value FROM json_each(?))'
			)
			.bind(id, JSON.stringify(change.files)),
		...insertFiles(db, id, change.files)
	]);
	// A page deleted meanwhile, when the change named no file, which would have been refused.
	if (!results[0].meta.changes) error(404, 'not-found');
	await deleteMarked(db, bucket);
	return info;
}

/** Deletes a page for the head, with its files. */
export async function deleteInfoPage(db: D1Database, bucket: R2Bucket, head: Head, id: string) {
	const { results, info } = await changeInfo(db, [
		db.prepare('DELETE FROM info_pages WHERE id = ?').bind(id)
	]);
	if (!results[0].meta.changes) error(404, 'not-found');
	await deleteMarked(db, bucket);
	return info;
}

/**
 * Puts the pages in the order the head's device sends, which names every page once. A device that doesn't know about
 * a page added or deleted meanwhile is told to load its records again.
 */
export async function orderInfoPages(db: D1Database, head: Head, pages: string[]) {
	const order = JSON.stringify(pages);
	const row = await db
		.prepare(
			`SELECT (SELECT COUNT(*) FROM info_pages) AS pages,
			(SELECT COUNT(*) FROM info_pages WHERE id IN (SELECT value FROM json_each(?))) AS named`
		)
		.bind(order)
		.first<{ pages: number; named: number }>();
	if (!row || row.pages !== pages.length || row.named !== pages.length) error(409, 'stale');
	const { info } = await changeInfo(db, [
		db
			.prepare(
				`UPDATE info_pages SET position = (SELECT key + 1 FROM json_each(?1) WHERE value = info_pages.id)
				WHERE id IN (SELECT value FROM json_each(?1))`
			)
			.bind(order)
	]);
	return info;
}

/**
 * Stores a file's encrypted bytes for a page about to be added or changed, which names the file when the head saves
 * it. A file stored already is refused as `stored`, and files no page names are deleted in the daily cleanup a day
 * later.
 */
export async function uploadInfoFile(
	db: D1Database,
	store: ObjectStore,
	head: Head,
	page: string,
	file: string,
	bytes: Uint8Array<ArrayBuffer>
) {
	await putObject(db, store, fileKey(page, file), bytes);
}

/** A page's file's encrypted bytes, while the page names it. Every connected device may fetch them. */
export async function infoFileBytes(
	db: D1Database,
	store: ObjectStore,
	page: string,
	file: string
) {
	const named = await db
		.prepare('SELECT 1 FROM info_files WHERE page_id = ? AND id = ?')
		.bind(page, file)
		.first();
	if (!named) error(404, 'not-found');
	return getObject(db, store, fileKey(page, file));
}
