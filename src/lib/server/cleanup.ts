import { deleteLeftovers } from './storage';

// The daily cleanup (worker/index.js): notices past their days, sessions that ran out with their
// subscriptions, one-time cards that can't connect a device anymore once no device they connected is signed in,
// and what R2 keeps that no record names anymore, such as the files of those notices. Imports stay relative:
// Wrangler bundles this for the scheduled handler without SvelteKit.

type CleanupEnv = { DB: D1Database; FILES: R2Bucket };

const day = 24 * 60 * 60 * 1000;

export async function cleanUp({ DB: db, FILES: bucket }: CleanupEnv, now = Date.now()) {
	await db.batch([
		db.prepare('DELETE FROM events WHERE expires_at <= ?').bind(now),
		db.prepare('DELETE FROM notices WHERE expires_at <= ?').bind(now),
		db
			.prepare(
				'DELETE FROM meeting_offers WHERE NOT EXISTS (SELECT 1 FROM meeting_slots WHERE offer_id=meeting_offers.id AND ends_at>?)'
			)
			.bind(now - 90 * day),
		db.prepare('DELETE FROM sessions WHERE expires_at <= ?').bind(now),
		// Printed cards have no end, so they never match.
		db
			.prepare(
				'DELETE FROM credentials WHERE connects_until <= ? AND id NOT IN (SELECT credential_id FROM sessions)'
			)
			.bind(now)
	]);
	// A day's grace keeps uploads whose records are still on their way.
	await deleteLeftovers(db, bucket, now - day);
}
