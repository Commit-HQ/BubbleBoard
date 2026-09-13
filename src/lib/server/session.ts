import { error, type RequestEvent } from '@sveltejs/kit';
import type { FamilyIdentity, Identity, Staff } from '$lib/api';
import { fromBase64Url, toBase64Url } from '$lib/base64url';
import { hashAuthToken, hashToken, randomBytes } from '$lib/crypto';
import { storageLimits } from './limits';
import type { ObjectStore } from './storage';

// A device connects with a card once and then uses a session: a random token in an HttpOnly, SameSite
// cookie, stored only as a hash. A session authorizes requests but opens nothing: keys stay on the device.

const cookieName = 'session';
const tokenBytes = 32;
const day = 24 * 60 * 60 * 1000;
/** A session ends after 90 days without use (product-spec.md §32). */
const lifetime = 90 * day;
/** A session in use is extended once it's this old, so most requests don't write. */
const renewAfter = 7 * day;

/** A staff member whose admin rights were checked for this request. Changes that need them take one. */
export type Admin = Staff & { admin: true };

export function database(event: RequestEvent) {
	const db = event.platform?.env.DB;
	if (!db) error(503, 'unavailable');
	return db;
}

/** The private R2 bucket that keeps encrypted photos and files, with the limits in .env it's held to. */
export function objectStore(event: RequestEvent): ObjectStore {
	const bucket = event.platform?.env.FILES;
	if (!bucket) error(503, 'unavailable');
	return { bucket, limits: storageLimits };
}

/** Compares hashes, so the time a comparison takes says nothing about the secret. */
export async function isSetupToken(event: RequestEvent, token: string) {
	const secret = event.platform?.env.SETUP_TOKEN;
	if (!secret) error(503, 'setup-unavailable');
	const encoder = new TextEncoder();
	const [given, expected] = await Promise.all(
		[token, secret].map((value) => hashToken(encoder.encode(value)))
	);
	return given === expected;
}

/**
 * Limits setup and card attempts from one address. Card secrets are far beyond guessing, so this keeps
 * the database from being flooded rather than protecting the cards. Without the limiter, nothing runs.
 */
export async function limitAttempts(event: RequestEvent) {
	const limiter = event.platform?.env.CARD_ATTEMPTS;
	if (!limiter) error(503, 'unavailable');
	const { success } = await limiter.limit({ key: event.getClientAddress() });
	if (!success) error(429, 'too-many-attempts');
}

const identityColumns = `c.id AS credential, c.wrapped_key AS wrappedKey, c.teacher_id AS teacher,
	c.family_id AS family, t.admin`;
const identityTables = 'credentials c LEFT JOIN teachers t ON t.id = c.teacher_id';

type IdentityRow = {
	credential: string;
	wrappedKey: string;
	teacher: string | null;
	family: string | null;
	admin: number | null;
};

function identity(row: IdentityRow | null): Identity | undefined {
	if (!row) return undefined;
	const { credential, wrappedKey, teacher, family } = row;
	if (teacher) return { kind: 'staff', credential, wrappedKey, teacher, admin: row.admin === 1 };
	return family ? { kind: 'family', credential, wrappedKey, family } : undefined;
}

export async function identityForCard(db: D1Database, authToken: string) {
	const hash = await hashAuthToken(authToken);
	const row = await db
		.prepare(`SELECT ${identityColumns} FROM ${identityTables} WHERE c.auth_token_hash = ?`)
		.bind(hash)
		.first<IdentityRow>();
	return identity(row);
}

function setCookie(event: RequestEvent, token: Uint8Array) {
	event.cookies.set(cookieName, toBase64Url(token), {
		path: '/api',
		httpOnly: true,
		sameSite: 'strict',
		maxAge: lifetime / 1000
	});
}

function cookieToken(event: RequestEvent) {
	const token = fromBase64Url(event.cookies.get(cookieName) ?? '');
	return token?.length === tokenBytes ? token : undefined;
}

export async function startSession(event: RequestEvent, credential: string) {
	const db = database(event);
	const token = randomBytes(tokenBytes);
	const previous = cookieToken(event);
	const now = Date.now();
	await db.batch([
		// This browser's earlier session. Sessions that ran out go in the daily cleanup (cleanup.ts).
		db
			.prepare('DELETE FROM sessions WHERE token_hash = ?')
			.bind(previous ? await hashToken(previous) : ''),
		db
			.prepare('INSERT INTO sessions (token_hash, credential_id, expires_at) VALUES (?, ?, ?)')
			.bind(await hashToken(token), credential, now + lifetime)
	]);
	setCookie(event, token);
}

/** The card behind this request's session, extending the session when it's due. */
async function currentIdentity(event: RequestEvent) {
	const token = cookieToken(event);
	if (!token) return undefined;
	const db = database(event);
	const hash = await hashToken(token);
	const now = Date.now();
	const row = await db
		.prepare(
			`SELECT ${identityColumns}, s.expires_at AS expiresAt FROM ${identityTables}
			JOIN sessions s ON s.credential_id = c.id WHERE s.token_hash = ? AND s.expires_at > ?`
		)
		.bind(hash, now)
		.first<IdentityRow & { expiresAt: number }>();
	if (row && row.expiresAt < now + lifetime - renewAfter) {
		await db
			.prepare('UPDATE sessions SET expires_at = ? WHERE token_hash = ?')
			.bind(now + lifetime, hash)
			.run();
		setCookie(event, token);
	}
	return identity(row);
}

/** This request's session as the database stores it: the hash of its token. */
export async function sessionHash(event: RequestEvent) {
	const token = cookieToken(event);
	return token && hashToken(token);
}

export async function endSession(event: RequestEvent) {
	const token = cookieToken(event);
	if (token) {
		await database(event)
			.prepare('DELETE FROM sessions WHERE token_hash = ?')
			.bind(await hashToken(token))
			.run();
	}
	event.cookies.delete(cookieName, { path: '/api' });
}

/** The session's card. Without one, the app asks for the card again. */
export async function requireIdentity(event: RequestEvent) {
	const current = await currentIdentity(event);
	if (!current) error(401, 'signed-out');
	return current;
}

export async function requireStaff(event: RequestEvent): Promise<Staff> {
	const current = await requireIdentity(event);
	if (current.kind !== 'staff') error(403, 'forbidden');
	return current;
}

export async function requireFamily(event: RequestEvent): Promise<FamilyIdentity> {
	const current = await requireIdentity(event);
	if (current.kind !== 'family') error(403, 'forbidden');
	return current;
}

export async function requireAdmin(event: RequestEvent): Promise<Admin> {
	const staff = await requireStaff(event);
	if (!staff.admin) error(403, 'forbidden');
	return { ...staff, admin: true };
}
