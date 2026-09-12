import { error } from '@sveltejs/kit';

/**
 * Runs statements as one D1 batch, which D1 runs as a transaction, turning broken invariants into
 * conflicts the app can explain.
 */
export async function transaction(db: D1Database, statements: D1PreparedStatement[]) {
	try {
		return await db.batch(statements);
	} catch (cause) {
		const message = cause instanceof Error ? cause.message : '';
		if (message.includes('last-admin')) error(409, 'last-admin');
		// The records changed since the device read them, or something the change refers to is gone.
		if (message.includes('stale') || message.includes('FOREIGN KEY constraint failed')) {
			error(409, 'stale');
		}
		throw cause;
	}
}
