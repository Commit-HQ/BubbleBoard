import { error } from '@sveltejs/kit';
import type { Identity, Staff, FamilyIdentity } from '$lib/api';
import type { ConsentChange, ConsentRow, EventRecord } from '$lib/events/types';
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
	rows: { family: string; label: string; choice?: string; revision?: number }[],
	teacher: string,
	/** Whether the child is being added, which the history says of a choice set then. */
	childAdded = false
) {
	return [
		db
			.prepare(
				'DELETE FROM photo_families WHERE child_id=? AND family_id NOT IN(SELECT value FROM json_each(?))'
			)
			.bind(child, JSON.stringify(rows.map((r) => r.family))),
		// A card taken off the child takes its history of the child with it, even while the family stays.
		db
			.prepare(
				'DELETE FROM photo_history WHERE child_id=? AND family_id NOT IN(SELECT value FROM json_each(?))'
			)
			.bind(child, JSON.stringify(rows.map((r) => r.family))),
		...rows.flatMap((r) =>
			r.choice === undefined
				? [
						db
							.prepare(
								'INSERT INTO photo_families(child_id,family_id,label) VALUES(?,?,?) ON CONFLICT(child_id,family_id) DO UPDATE SET label=excluded.label'
							)
							.bind(child, r.family, r.label)
					]
				: [
						db
							.prepare(
								`INSERT INTO photo_families(child_id,family_id,label,choice) VALUES(?1,?2,?3,?4)
							ON CONFLICT(child_id,family_id) DO UPDATE SET label=excluded.label,
							choice=CASE WHEN photo_families.revision=?5 THEN excluded.choice ELSE NULL END,
							revision=CASE WHEN photo_families.revision=?5 THEN photo_families.revision+1 ELSE NULL END`
							)
							.bind(child, r.family, r.label, r.choice, r.revision ?? -1),
						// A stale write above fails the whole transaction, so this only ever records a choice that stands.
						db
							.prepare(
								'INSERT INTO photo_history(child_id,family_id,choice,at,teacher_id,child_added) VALUES(?,?,?,?,?,?)'
							)
							.bind(child, r.family, r.choice, Date.now(), teacher, Number(childAdded)),
						trimHistory(db, child, r.family)
					]
		)
	];
}

/** Most choices kept for one child and family card, so a device changing its mind in a loop fills nothing. */
const historyLimit = 50;

/** Drops a child and family card's oldest face-sharing choices beyond `historyLimit`. */
const trimHistory = (db: D1Database, child: string, family: string) =>
	db
		.prepare(
			`DELETE FROM photo_history WHERE child_id=?1 AND family_id=?2 AND rowid NOT IN(
			SELECT rowid FROM photo_history WHERE child_id=?1 AND family_id=?2 ORDER BY at DESC,rowid DESC LIMIT ?3)`
		)
		.bind(child, family, historyLimit);

/**
 * When a child's face sharing was set, newest first, with the sealed choice, the teacher who recorded a
 * consent form, and whether that was as the child was added. A family reads only its own card's entries, and staff those of the children they see.
 */
export async function consentHistory(db: D1Database, viewer: Identity, child: string) {
	const [visible, params] = visibleClassrooms(viewer);
	const { results } = await db
		.prepare(
			`SELECT h.child_id AS child,h.family_id AS family,h.choice,h.at,h.teacher_id AS teacher,h.child_added AS childAdded FROM photo_history h
			JOIN children c ON c.id=h.child_id WHERE h.child_id=? AND c.classroom_id IN (${visible})
			${viewer.kind === 'family' ? 'AND h.family_id=?' : ''} ORDER BY h.at DESC,h.rowid DESC`
		)
		.bind(child, ...params, ...(viewer.kind === 'family' ? [viewer.family] : []))
		.all<Omit<ConsentChange, 'childAdded'> & { childAdded: number }>();
	return results.map((row): ConsentChange => ({ ...row, childAdded: row.childAdded === 1 }));
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
	// The history is written only over the revision the update checks, so both happen or neither does.
	const [, , update] = await db.batch([
		db
			.prepare(
				'INSERT INTO photo_history(child_id,family_id,choice,at) SELECT child_id,family_id,?,? FROM photo_families WHERE child_id=? AND family_id=? AND revision=?'
			)
			.bind(choice, Date.now(), child, family.family, revision),
		trimHistory(db, child, family.family),
		db
			.prepare(
				'UPDATE photo_families SET choice=?,revision=revision+1 WHERE child_id=? AND family_id=? AND revision=?'
			)
			.bind(choice, child, family.family, revision)
	]);
	if (!update.meta.changes) error(409, 'stale');
}
export async function events(db: D1Database, viewer: Identity) {
	const [visible, params] = visibleClassrooms(viewer);
	const { results } = await db
		.prepare(
			`SELECT id,classroom_id AS classroom,teacher_id AS teacher,content,event_key AS eventKey,posted_at AS postedAt,edited_at AS editedAt,edited_by AS editedBy,expires_at AS expiresAt FROM events WHERE posted_at IS NOT NULL AND expires_at>? AND classroom_id IN(${visible}) ORDER BY posted_at DESC`
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
async function editable(db: D1Database, staff: Staff, id: string) {
	const row = await db
		.prepare(
			'SELECT classroom_id AS classroom,credential_id AS credential,posted_at AS postedAt,expires_at AS expiresAt FROM events WHERE id=?'
		)
		.bind(id)
		.first<{
			classroom: string;
			credential: string;
			postedAt: number | null;
			expiresAt: number;
		}>();
	if (!row || row.expiresAt <= Date.now()) error(404, 'not-found');
	await checkClassrooms(db, staff, [row.classroom]);
	// An event still being prepared belongs to the one card preparing it, photos and all. Once it's up it
	// belongs to every teacher of its classroom, as a notice does, which `checkClassrooms` has settled.
	if (row.postedAt === null && row.credential !== staff.credential) error(403, 'forbidden');
	return row;
}
/**
 * Refuses a commit naming a photo whose bytes aren't in R2. A failed put can leave the photo counted without
 * them, so each is looked for before the commit that names it.
 */
async function checkStored(store: ObjectStore, id: string, files: string[]) {
	const stored = await Promise.all(files.map((file) => store.bucket.head(`events/${id}/${file}`)));
	if (stored.some((object) => !object)) error(409, 'stale');
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
	await editable(db, staff, id);
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
	const row = await editable(db, staff, id);
	if (row.postedAt !== null) return { published: false, classroom: row.classroom };
	await checkStored(store, id, files);
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
	const [row, held] = await Promise.all([
		editable(db, staff, id),
		db.prepare('SELECT id FROM event_files WHERE event_id=?').bind(id).all<{ id: string }>()
	]);
	if (row.postedAt === null) error(404, 'not-found');
	// An event is its photos: one that keeps none is deleted instead, which takes its bytes with it.
	if (!files.length) error(400, 'invalid');
	const kept = new Set(held.results.map((file) => file.id));
	const coming = files.filter((file) => !kept.has(file));
	// Only a change that brings photos is held to the revisions, and it can't be made without them.
	const revisions = coming.length ? (added ?? error(400, 'invalid')) : undefined;
	await checkStored(store, id, coming);
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
				'UPDATE events SET content=?,edited_at=?,edited_by=?,expires_at=? WHERE id=? AND posted_at IS NOT NULL AND expires_at>?'
			)
			.bind(content, now, staff.teacher, row.postedAt + days * day, id, now)
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
