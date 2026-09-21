import { error } from '@sveltejs/kit';
import type { Identity, Staff, FamilyIdentity } from '$lib/api';
import type { ConsentRow, EventRecord } from '$lib/events/types';
import { checkClassrooms, transaction, visibleClassrooms } from './database';
import { getObject, putObject, deleteMarked, type ObjectStore } from './storage';
import { day } from '$lib/notices';

/**
 * The consent rows a viewer may read, with the revisions a publication is held to. `revision` is the consent
 * clock of the classroom asked for; the family call asks for no classroom and reads only the rows, so it
 * gets 0 rather than a clock that would mean nothing.
 */
export async function consents(db: D1Database, viewer: Identity, classroom?: string) {
	const [visible, params] = visibleClassrooms(viewer);
	const results = await db.batch([
		db.prepare('SELECT revision FROM installation'),
		db.prepare('SELECT revision FROM photo_clock WHERE classroom_id=?').bind(classroom ?? ''),
		db
			.prepare(
				`SELECT p.child_id AS child,p.family_id AS family,p.label,p.choice,p.revision FROM photo_families p JOIN children c ON c.id=p.child_id WHERE c.classroom_id IN (${visible}) AND (? IS NULL OR c.classroom_id=?) ${viewer.kind === 'family' ? 'AND p.family_id=?' : ''}`
			)
			.bind(
				...params,
				classroom ?? null,
				classroom ?? null,
				...(viewer.kind === 'family' ? [viewer.family] : [])
			)
	]);
	return {
		catalog: (results[0].results[0] as { revision: number }).revision,
		revision: (results[1].results[0] as { revision: number } | undefined)?.revision ?? 0,
		rows: results[2].results as ConsentRow[]
	};
}

/**
 * The child's name for each linked family, and, for a row staff also set a choice on, that choice. A choice
 * is written only over the row revision the device read, so a parent's change made meanwhile empties the
 * revision instead, which fails the whole transaction as stale (database.ts). A row that staff expect to be
 * new takes revision -1, which no stored row has.
 */
export function projectionStatements(
	db: D1Database,
	child: string,
	rows: { family: string; label: string; choice?: string; revision?: number }[]
) {
	return [
		db
			.prepare(
				'DELETE FROM photo_families WHERE child_id=? AND family_id NOT IN(SELECT value FROM json_each(?))'
			)
			.bind(child, JSON.stringify(rows.map((r) => r.family))),
		...rows.map((r) =>
			r.choice === undefined
				? db
						.prepare(
							'INSERT INTO photo_families(child_id,family_id,label) VALUES(?,?,?) ON CONFLICT(child_id,family_id) DO UPDATE SET label=excluded.label'
						)
						.bind(child, r.family, r.label)
				: db
						.prepare(
							`INSERT INTO photo_families(child_id,family_id,label,choice) VALUES(?1,?2,?3,?4)
							ON CONFLICT(child_id,family_id) DO UPDATE SET label=excluded.label,
							choice=CASE WHEN photo_families.revision=?5 THEN excluded.choice ELSE NULL END,
							revision=CASE WHEN photo_families.revision=?5 THEN photo_families.revision+1 ELSE NULL END`
						)
						.bind(child, r.family, r.label, r.choice, r.revision ?? -1)
		)
	];
}
// Backfill old catalogs, bound to the exact catalog revision the staff device decrypted.
export async function syncProjections(
	db: D1Database,
	staff: Staff,
	classroom: string,
	revision: number,
	rows: { child: string; family: string; label: string }[]
) {
	await checkClassrooms(db, staff, [classroom]);
	await transaction(db, [
		// The guard fails the batch by leaving `revision` empty, so it has to reach a row: it stays unscoped,
		// where a `WHERE` that matched nothing would let an outdated device through. It writes each row's own
		// revision back, so nothing moves when the catalog is the one the device read.
		db
			.prepare(
				'UPDATE photo_clock SET revision=CASE WHEN (SELECT revision FROM installation)=? THEN revision ELSE NULL END'
			)
			.bind(revision),
		...rows.map((r) =>
			db
				.prepare(
					`INSERT INTO photo_families(child_id,family_id,label) SELECT c.id,?,? FROM children c JOIN family_classrooms f ON f.classroom_id=c.classroom_id AND f.family_id=? WHERE c.id=? AND c.classroom_id=? ON CONFLICT(child_id,family_id) DO UPDATE SET label=excluded.label`
				)
				.bind(r.family, r.label, r.family, r.child, classroom)
		)
	]);
}
export async function saveConsent(
	db: D1Database,
	family: FamilyIdentity,
	child: string,
	revision: number,
	choice: string
) {
	const result = await db
		.prepare(
			'UPDATE photo_families SET choice=?,revision=revision+1 WHERE child_id=? AND family_id=? AND revision=?'
		)
		.bind(choice, child, family.family, revision)
		.run();
	if (!result.meta.changes) error(409, 'stale');
}
export async function events(db: D1Database, viewer: Identity) {
	const [visible, params] = visibleClassrooms(viewer);
	const { results } = await db
		.prepare(
			`SELECT id,classroom_id AS classroom,teacher_id AS teacher,content,event_key AS eventKey,posted_at AS postedAt,edited_at AS editedAt,expires_at AS expiresAt FROM events WHERE posted_at IS NOT NULL AND expires_at>? AND classroom_id IN(${visible}) ORDER BY posted_at DESC`
		)
		.bind(Date.now(), ...params)
		.all<EventRecord>();
	return results;
}
export async function startEvent(
	db: D1Database,
	staff: Staff,
	id: string,
	classroom: string,
	catalog: number,
	consent: number
) {
	await checkClassrooms(db, staff, [classroom]);
	await db
		.prepare(
			'INSERT INTO events(id,classroom_id,teacher_id,credential_id,expires_at,catalog_revision,consent_revision) VALUES(?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING'
		)
		.bind(id, classroom, staff.teacher, staff.credential, Date.now() + day, catalog, consent)
		.run();
	const row = await db
		.prepare('SELECT credential_id AS credential,classroom_id AS classroom FROM events WHERE id=?')
		.bind(id)
		.first<{ credential: string; classroom: string }>();
	if (row?.credential !== staff.credential || row.classroom !== classroom) error(403, 'forbidden');
}
async function editable(db: D1Database, staff: Staff, id: string, draft = false) {
	const row = await db
		.prepare(
			'SELECT classroom_id AS classroom,teacher_id AS teacher,credential_id AS credential,posted_at AS postedAt,expires_at AS expiresAt FROM events WHERE id=?'
		)
		.bind(id)
		.first<{
			classroom: string;
			teacher: string | null;
			credential: string;
			postedAt: number | null;
			expiresAt: number;
		}>();
	if (!row || row.expiresAt <= Date.now()) error(404, 'not-found');
	await checkClassrooms(db, staff, [row.classroom]);
	// An event still being prepared belongs to the one card preparing it, photos and all. Once it's up it
	// belongs to whoever may change it: its author, or any admin, as a notice does.
	const own =
		draft && row.postedAt === null
			? row.credential === staff.credential
			: staff.admin || row.teacher === staff.teacher;
	if (!own) error(403, 'forbidden');
	return row;
}
export async function uploadEventFile(
	db: D1Database,
	store: ObjectStore,
	staff: Staff,
	id: string,
	file: string,
	bytes: Uint8Array<ArrayBuffer>
) {
	// Photos are uploaded before the event names them, both for the first publication and for a change that
	// adds some. Until a change names one in `event_files` nobody can read it, and an object no record names
	// is reclaimed by the daily cleanup (storage.ts).
	await editable(db, staff, id, true);
	await putObject(db, store, `events/${id}/${file}`, bytes);
}
export async function publishEvent(
	db: D1Database,
	store: ObjectStore,
	staff: Staff,
	id: string,
	content: string,
	key: string,
	files: string[],
	days: number
) {
	const row = await editable(db, staff, id, true);
	if (row.postedAt !== null) return { published: false, classroom: row.classroom };
	// A failed R2 put can leave a counted object; HEAD every file before the atomic commit.
	const stored = await Promise.all(files.map((file) => store.bucket.head(`events/${id}/${file}`)));
	if (stored.some((object) => !object)) error(409, 'stale');
	const now = Date.now();
	const result = await transaction(db, [
		...files.map((file) =>
			db
				.prepare('INSERT INTO event_files(event_id,id) VALUES(?,?) ON CONFLICT DO NOTHING')
				.bind(id, file)
		),
		db
			.prepare(
				'UPDATE events SET content=?,event_key=?,posted_at=?,expires_at=? WHERE id=? AND posted_at IS NULL AND expires_at>?'
			)
			.bind(content, key, now, now + days * day, id, now)
	]);
	return { published: !!result.at(-1)?.meta.changes, classroom: row.classroom };
}
/**
 * Changes an event that's up: its words, how long it stays, and which photos it holds. The photos it keeps
 * are left exactly as they were published, with the consent of that day sealed into them; the photos it
 * leaves out go on their way out with their rows, and the ones it adds were uploaded first, under the
 * event's own key, and it must keep at least one. `added` carries the catalog and consent revisions the device prepared those new photos
 * against, and is required as soon as the change brings any: a change that only rewrites words or drops
 * photos depends on no consent at all.
 */
export async function changeEvent(
	db: D1Database,
	store: ObjectStore,
	staff: Staff,
	id: string,
	content: string,
	files: string[],
	days: number,
	added?: { catalog: number; consent: number }
) {
	const row = await editable(db, staff, id);
	if (row.postedAt === null) error(404, 'not-found');
	// An event is its photos: one that keeps none is deleted instead, which takes its bytes with it.
	if (!files.length) error(400, 'invalid');
	const held = await db
		.prepare('SELECT id FROM event_files WHERE event_id=?')
		.bind(id)
		.all<{ id: string }>();
	const kept = new Set(held.results.map((file) => file.id));
	const coming = files.filter((file) => !kept.has(file));
	// Only a change that brings photos is held to the revisions, and it can't be made without them.
	const revisions = coming.length ? (added ?? error(400, 'invalid')) : undefined;
	// A failed R2 put can leave a counted object; HEAD every new file before the atomic commit.
	const stored = await Promise.all(coming.map((file) => store.bucket.head(`events/${id}/${file}`)));
	if (stored.some((object) => !object)) error(409, 'stale');
	const now = Date.now();
	const result = await transaction(db, [
		// `event_publish` compares the revisions only as an event first goes up, so a change that brings new
		// photos compares them here instead: they were covered against a roster and a set of choices, and a
		// parent who changed their mind meanwhile must not have their child published under the old answer.
		// As in `syncProjections`, the guard stays unscoped so it reaches a row, and writes each clock back
		// unchanged; leaving `revision` empty fails the whole batch as stale (database.ts).
		...(revisions
			? [
					db
						.prepare(
							`UPDATE photo_clock SET revision=CASE WHEN (SELECT revision FROM installation)=?1
							AND ?2=(SELECT revision FROM photo_clock WHERE classroom_id=?3) THEN revision ELSE NULL END`
						)
						.bind(revisions.catalog, revisions.consent, row.classroom)
				]
			: []),
		...coming.map((file) =>
			db.prepare('INSERT INTO event_files(event_id,id) VALUES(?,?)').bind(id, file)
		),
		// The photos the change leaves out go on their way out with their rows (`event_files_leaving`).
		db
			.prepare(
				'DELETE FROM event_files WHERE event_id=? AND id NOT IN(SELECT value FROM json_each(?))'
			)
			.bind(id, JSON.stringify(files)),
		// Its days count from when it went up, as a changed notice's do.
		db
			.prepare(
				'UPDATE events SET content=?,edited_at=?,expires_at=? WHERE id=? AND posted_at IS NOT NULL AND expires_at>?'
			)
			.bind(content, now, row.postedAt + days * day, id, now)
	]);
	await deleteMarked(db, store.bucket);
	return !!result.at(-1)?.meta.changes;
}
export async function eventFile(
	db: D1Database,
	store: ObjectStore,
	viewer: Identity,
	id: string,
	file: string
) {
	const [visible, params] = visibleClassrooms(viewer);
	const row = await db
		.prepare(
			`SELECT 1 FROM event_files f JOIN events e ON e.id=f.event_id WHERE e.id=? AND f.id=? AND e.posted_at IS NOT NULL AND e.expires_at>? AND e.classroom_id IN(${visible})`
		)
		.bind(id, file, Date.now(), ...params)
		.first();
	if (!row) error(404, 'not-found');
	return getObject(db, store, `events/${id}/${file}`);
}
export async function removeEvent(db: D1Database, store: ObjectStore, staff: Staff, id: string) {
	await editable(db, staff, id);
	await db.prepare('DELETE FROM events WHERE id=?').bind(id).run();
	await deleteMarked(db, store.bucket);
}
