import { deleteLeftovers } from './storage';

// The daily cleanup (worker/index.js): notices past their days, sessions that ran out with their
// subscriptions, and what R2 keeps that no record names anymore, such as the files of those notices. Imports
// stay relative: Wrangler bundles this for the scheduled handler without SvelteKit.

export type CleanupEnv = { DB: D1Database; FILES: R2Bucket };

const day = 24 * 60 * 60 * 1000;

export async function cleanUp({ DB: db, FILES: bucket }: CleanupEnv, now = Date.now()) {
	await db.batch([
		db.prepare('DELETE FROM notices WHERE expires_at <= ?').bind(now),
		db.prepare('DELETE FROM sessions WHERE expires_at <= ?').bind(now)
	]);
	// A day's grace keeps uploads whose records are still on their way.
	await deleteLeftovers(db, bucket, now - day);
}
