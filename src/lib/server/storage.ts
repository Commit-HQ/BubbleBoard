import { error } from '@sveltejs/kit';

// What BubbleBoard keeps in private R2, counted in the database so an installation stays within the limits
// in .env (src/lib/server/limits.ts): the bytes stored, and each month's uploads and downloads, which R2
// counts as Class A and Class B operations. An object is counted before its bytes are stored and forgotten
// only after they're deleted, so the count never falls below what R2 holds. Each key is stored once, so no
// upload changes bytes a record names or slips in while they're deleted. Records name the objects they keep
// (named_objects in migrations/); bytes no record names are deleted at once when a change leaves them behind,
// and in the daily cleanup when a change didn't finish. Imports stay relative: the daily cleanup runs this
// without SvelteKit (worker/index.js).

/** The most an installation keeps in R2, in bytes, and uploads and downloads in a month. */
export type StorageLimits = { bytes: number; uploads: number; downloads: number };
/** The private R2 bucket, with the limits it's held to. */
export type ObjectStore = { bucket: R2Bucket; limits: StorageLimits };

/** Keys handled at a time: R2 deletes up to 1,000 at once, and the database reads them as one value. */
const batchSize = 500;

/** Counts an upload or a download against its month's limit, or refuses it once the month has reached it. */
async function count(
	db: D1Database,
	operation: 'uploads' | 'downloads',
	limit: number,
	now: number
) {
	const month = new Date(now).toISOString().slice(0, 7);
	// One statement, so requests at the same moment can't pass the limit together.
	const { meta } = await db
		.prepare(
			`INSERT INTO storage_months (month, ${operation}) SELECT ?1, 1 WHERE ?2 > 0
			ON CONFLICT (month) DO UPDATE SET ${operation} = ${operation} + 1 WHERE ${operation} < ?2`
		)
		.bind(month, limit)
		.run();
	if (!meta.changes) error(429, operation === 'uploads' ? 'upload-limit' : 'download-limit');
}

/**
 * Stores an object's bytes under a key that isn't stored yet, once the month's uploads and the bytes already
 * stored leave room for them. A key that's stored already is refused as `stored`, which after a lost
 * response means its bytes are there. An upload refused for want of room still counts against the month.
 */
export async function putObject(
	db: D1Database,
	{ bucket, limits }: ObjectStore,
	key: string,
	bytes: Uint8Array<ArrayBuffer>,
	now = Date.now()
) {
	const stored = () => error(409, 'stored');
	if (await db.prepare('SELECT 1 FROM stored_objects WHERE key = ?').bind(key).first()) stored();
	await count(db, 'uploads', limits.uploads, now);
	const { meta } = await db
		.prepare(
			`INSERT INTO stored_objects (key, bytes, stored_at) SELECT ?1, ?2, ?3
			WHERE (SELECT COALESCE(SUM(bytes), 0) FROM stored_objects) + ?2 <= ?4`
		)
		.bind(key, bytes.length, now, limits.bytes)
		.run()
		.catch((cause: unknown) => {
			// Another upload of the same key came first.
			if (String((cause as Error | undefined)?.message).includes('UNIQUE')) stored();
			throw cause;
		});
	if (!meta.changes) error(507, 'storage-full');
	await bucket.put(key, bytes);
}

/** An object's bytes, counted against the month's downloads, or undefined when R2 doesn't have them. */
export async function getObject(
	db: D1Database,
	{ bucket, limits }: ObjectStore,
	key: string,
	now = Date.now()
) {
	await count(db, 'downloads', limits.downloads, now);
	return (await bucket.get(key))?.body;
}

/**
 * Deletes those of these objects no record names. Each is marked as on its way out in the statement that
 * finds no record names it, so no record can name it after that (migrations/0008_notice_files.sql), and no
 * upload can store its key again until its count goes, after its bytes.
 */
export async function deleteUnnamed(db: D1Database, bucket: R2Bucket, keys: string[]) {
	for (let start = 0; start < keys.length; start += batchSize) {
		const { results } = await db
			.prepare(
				`UPDATE stored_objects SET deleting = 1 WHERE key IN (SELECT value FROM json_each(?))
				AND key NOT IN (SELECT key FROM named_objects) RETURNING key`
			)
			.bind(JSON.stringify(keys.slice(start, start + batchSize)))
			.all<{ key: string }>();
		const unnamed = results.map(({ key }) => key);
		if (!unnamed.length) continue;
		await bucket.delete(unnamed);
		await db
			.prepare(
				'DELETE FROM stored_objects WHERE deleting AND key IN (SELECT value FROM json_each(?))'
			)
			.bind(JSON.stringify(unnamed))
			.run();
	}
}

/**
 * Deletes objects no record names that were stored before `before`, or were already on their way out: left
 * by a change that didn't finish, or by records that went without deleting them, such as notices past their
 * days.
 */
export async function deleteLeftovers(db: D1Database, bucket: R2Bucket, before: number) {
	const { results } = await db
		.prepare(
			`SELECT key FROM stored_objects WHERE (stored_at < ? OR deleting)
			AND key NOT IN (SELECT key FROM named_objects)`
		)
		.bind(before)
		.all<{ key: string }>();
	await deleteUnnamed(
		db,
		bucket,
		results.map(({ key }) => key)
	);
}
