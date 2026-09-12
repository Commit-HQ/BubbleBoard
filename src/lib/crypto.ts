import { fromBase64Url, toBase64Url } from '$lib/base64url';

// Keys and encryption for classroom access, run in the browser. docs/access-format.md describes the
// format: keep the two in step, and give any change to the bytes it describes a new format version.
//
// Raw key bytes exist only inside createKey, rewrapKey, and unwrapKey. Every CryptoKey returned here is
// non-extractable, which prevents accidental export, not use by a malicious script running in the app.

const FORMAT = 1;
export const SECRET_BYTES = 32;
const KEY_BYTES = 32;
const IV_BYTES = 12;
const aesGcm = { name: 'AES-GCM', length: 256 };
const encoder = new TextEncoder();

export type Role = 'teacher' | 'family';

/** The record a wrapped key belongs to, named `<key>-key-for-<whoever opens it>`. */
export type KeyContext =
	| { purpose: 'teacher-key-for-credential'; classroom: string; credential: string }
	| { purpose: 'family-key-for-credential'; classroom: string; credential: string }
	| { purpose: 'family-key-for-teacher'; classroom: string; family: string }
	| { purpose: 'group-key-for-teacher'; classroom: string }
	| { purpose: 'group-key-for-family'; classroom: string; family: string };

/** The record encrypted data belongs to. */
export type DataContext =
	| { purpose: 'classroom-profile'; classroom: string }
	| { purpose: 'classroom-admin'; classroom: string };

/** A key that wraps or opens another key, and the record the wrapped key belongs to. */
export type Wrapping = { key: CryptoKey; context: KeyContext };

/** Anything that doesn't open: malformed, modified, or given the wrong key or record. */
export class UnreadableError extends Error {
	constructor(options?: ErrorOptions) {
		super('Unreadable card or envelope', options);
		this.name = 'UnreadableError';
	}
}

/** A random opaque record ID: 128 bits, as 22 base64url characters. */
export function createId() {
	return toBase64Url(randomBytes(16));
}

/** A new card secret. */
export function createSecret() {
	return randomBytes(SECRET_BYTES);
}

/**
 * Derives a card's two independent values: the auth token, which is sent to the server, and the unlock
 * key, which opens the credential's wrapped key and never leaves the device.
 */
export async function deriveCredential(secret: Uint8Array<ArrayBuffer>, role: Role) {
	if (secret.length !== SECRET_BYTES) throw new UnreadableError();
	const base = await crypto.subtle.importKey('raw', secret, 'HKDF', false, [
		'deriveBits',
		'deriveKey'
	]);
	const hkdf = (label: string) => ({
		name: 'HKDF',
		hash: 'SHA-256',
		salt: new Uint8Array(),
		info: encoder.encode(`BubbleBoard ${FORMAT} ${role}-${label}`)
	});
	const [authToken, unlockKey] = await Promise.all([
		crypto.subtle.deriveBits(hkdf('auth'), base, 256),
		crypto.subtle.deriveKey(hkdf('key-wrap'), base, aesGcm, false, ['encrypt', 'decrypt'])
	]);
	return { authToken: toBase64Url(new Uint8Array(authToken)), unlockKey };
}

/** Creates a random key wrapped for each recipient, and returns it for use on this device as well. */
export async function createKey(recipients: Wrapping[]) {
	assertOneKind(recipients);
	const raw = randomBytes(KEY_BYTES);
	try {
		const [key, envelopes] = await Promise.all([importKey(raw), wrapAll(raw, recipients)]);
		return { key, envelopes };
	} finally {
		raw.fill(0);
	}
}

/** Wraps an existing key for more recipients. `from` opens it; its raw bytes stay inside this function. */
export async function rewrapKey(envelope: string, from: Wrapping, recipients: Wrapping[]) {
	assertOneKind([from, ...recipients]);
	const raw = await openKey(envelope, from);
	try {
		return await wrapAll(raw, recipients);
	} finally {
		raw.fill(0);
	}
}

/** Opens a wrapped key for use on this device. */
export async function unwrapKey(envelope: string, wrapping: Wrapping) {
	const raw = await openKey(envelope, wrapping);
	try {
		return await importKey(raw);
	} finally {
		raw.fill(0);
	}
}

export function encryptData(data: unknown, key: CryptoKey, context: DataContext) {
	return seal(encoder.encode(JSON.stringify(data)), key, context);
}

/** Decrypts JSON data. Anyone holding the key could have written it, so validate its shape. */
export async function decryptData(envelope: string, key: CryptoKey, context: DataContext) {
	const plaintext = await open(envelope, key, context);
	try {
		return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(plaintext)) as unknown;
	} catch (cause) {
		throw new UnreadableError({ cause });
	}
}

function randomBytes(length: number) {
	return crypto.getRandomValues(new Uint8Array(length));
}

function importKey(raw: Uint8Array<ArrayBuffer>) {
	return crypto.subtle.importKey('raw', raw, aesGcm, false, ['encrypt', 'decrypt']);
}

function wrapAll(raw: Uint8Array<ArrayBuffer>, recipients: Wrapping[]) {
	return Promise.all(recipients.map(({ key, context }) => seal(raw, key, context)));
}

async function openKey(envelope: string, { key, context }: Wrapping) {
	const raw = await open(envelope, key, context);
	if (raw.length === KEY_BYTES) return raw;
	raw.fill(0);
	throw new UnreadableError();
}

// A key keeps its kind for every recipient: a Group Key is never stored as a Family Key.
function assertOneKind(wrappings: Wrapping[]) {
	const kinds = new Set(wrappings.map(({ context }) => context.purpose.split('-')[0]));
	if (kinds.size !== 1)
		throw new TypeError('Wrap a key for at least one recipient, as one kind of key');
}

// Format 1: `1.<iv>.<ciphertext>` in base64url. AES-256-GCM with a fresh 96-bit IV, the 128-bit tag at
// the end of the ciphertext, and the record's context as additional authenticated data.
const envelopePattern = /^1\.([\w-]{16})\.([\w-]{22,})$/;

async function seal(
	plaintext: Uint8Array<ArrayBuffer>,
	key: CryptoKey,
	context: KeyContext | DataContext
) {
	const iv = randomBytes(IV_BYTES);
	const ciphertext = await crypto.subtle.encrypt(
		{ name: 'AES-GCM', iv, additionalData: additionalData(context) },
		key,
		plaintext
	);
	return `${FORMAT}.${toBase64Url(iv)}.${toBase64Url(new Uint8Array(ciphertext))}`;
}

async function open(envelope: string, key: CryptoKey, context: KeyContext | DataContext) {
	const parts = envelopePattern.exec(envelope);
	const iv = parts && fromBase64Url(parts[1]);
	const ciphertext = parts && fromBase64Url(parts[2]);
	if (!iv || !ciphertext) throw new UnreadableError();
	try {
		const plaintext = await crypto.subtle.decrypt(
			{ name: 'AES-GCM', iv, additionalData: additionalData(context) },
			key,
			ciphertext
		);
		return new Uint8Array(plaintext);
	} catch (cause) {
		throw new UnreadableError({ cause });
	}
}

// Binds an envelope to its record: format, purpose, classroom, and the credential or family it belongs
// to. Moved to any other record, even one encrypted with the same key, it doesn't open.
function additionalData(context: KeyContext | DataContext) {
	const subject =
		'credential' in context ? context.credential : 'family' in context ? context.family : null;
	return encoder.encode(
		JSON.stringify(['BubbleBoard', FORMAT, context.purpose, context.classroom, subject])
	);
}
