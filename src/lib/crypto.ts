import { fromBase64Url, toBase64Url } from '$lib/base64url';

// Keys and encryption for kindergarten access, run in the browser, as docs/access-format.md describes.
//
// Cards and envelopes are versioned separately. Printed cards derive their values with the card format 1
// labels below for good, whatever happens to envelopes. A change to the bytes of either breaks cards or
// records that already exist; src/lib/compatibility.test.ts holds values from September 2026 to catch it.
//
// Raw key bytes exist only inside createKey, rewrapKey, and unwrapKey. Every CryptoKey returned here is
// non-extractable, which prevents accidental export, not use by a malicious script running in the app.

/** Card format 1: the secret's size, the auth token's, and the HKDF labels for its two values. Never change them. */
export const SECRET_BYTES = 16;
export const AUTH_TOKEN_BYTES = 32;
const cardLabels = { auth: 'BubbleBoard card 1 auth', unlock: 'BubbleBoard card 1 key-wrap' };

/** Envelope format 1. A new format gets a new number, and readers keep opening the old ones. */
const ENVELOPE_FORMAT = 1;
export const KEY_BYTES = 32;
const IV_BYTES = 12;
const TAG_BYTES = 16;
/** What envelope format 1's binary form adds to the bytes it holds: the format, the IV, and the tag. */
export const SEALED_BYTES_OVERHEAD = 1 + IV_BYTES + TAG_BYTES;
const aesGcm = { name: 'AES-GCM', length: 256 };
const encoder = new TextEncoder();

/** The record a wrapped key belongs to, named `<key>-key-for-<whoever opens it>`. */
type KeyContext =
	| { purpose: 'staff-key-for-credential'; credential: string }
	| { purpose: 'family-key-for-credential'; credential: string }
	| { purpose: 'family-key-for-staff'; family: string }
	| { purpose: 'group-key-for-staff'; classroom: string }
	| { purpose: 'group-key-for-family'; classroom: string; family: string }
	| { purpose: 'notice-key-for-classroom'; classroom: string; notice: string };

/** The record encrypted data belongs to. */
type DataContext =
	| { purpose: 'classroom-profile'; classroom: string }
	| { purpose: 'teacher-profile'; teacher: string }
	| { purpose: 'child-profile'; child: string }
	| { purpose: 'family-profile'; family: string }
	| { purpose: 'notice-content'; notice: string }
	// Encrypted with the answering family's Family Key, which ties it to that family.
	| { purpose: 'poll-vote'; notice: string }
	| { purpose: 'board-photo'; classroom: string; photo: string };

/** A key that wraps or opens another key, and the record the wrapped key belongs to. */
export type Wrapping = { key: CryptoKey; context: KeyContext };

/** How each kind of key is wrapped for whoever opens it (docs/access-format.md). */
export const wrapping = {
	staffKeyForCard: (key: CryptoKey, credential: string): Wrapping => ({
		key,
		context: { purpose: 'staff-key-for-credential', credential }
	}),
	familyKeyForCard: (key: CryptoKey, credential: string): Wrapping => ({
		key,
		context: { purpose: 'family-key-for-credential', credential }
	}),
	familyKeyForStaff: (key: CryptoKey, family: string): Wrapping => ({
		key,
		context: { purpose: 'family-key-for-staff', family }
	}),
	groupKeyForStaff: (key: CryptoKey, classroom: string): Wrapping => ({
		key,
		context: { purpose: 'group-key-for-staff', classroom }
	}),
	groupKeyForFamily: (key: CryptoKey, classroom: string, family: string): Wrapping => ({
		key,
		context: { purpose: 'group-key-for-family', classroom, family }
	}),
	noticeKeyForClassroom: (key: CryptoKey, classroom: string, notice: string): Wrapping => ({
		key,
		context: { purpose: 'notice-key-for-classroom', classroom, notice }
	})
};

/** Anything that doesn't open: malformed, modified, or given the wrong key or record. */
export class UnreadableError extends Error {
	readonly code = 'unreadable';

	constructor(options?: ErrorOptions) {
		super('Unreadable card or envelope', options);
		this.name = 'UnreadableError';
	}
}

/** A random opaque record ID: 128 bits, as 22 base64url characters. */
export function createId() {
	return toBase64Url(randomBytes(16));
}

export function isId(value: unknown): value is string {
	return typeof value === 'string' && fromBase64Url(value)?.length === 16;
}

export function randomBytes(length: number) {
	return crypto.getRandomValues(new Uint8Array(length));
}

/** A token as the server stores it: the SHA-256 of its bytes, in base64url. */
export async function hashToken(token: Uint8Array<ArrayBuffer>) {
	return toBase64Url(new Uint8Array(await crypto.subtle.digest('SHA-256', token)));
}

/** A card's auth token as the server stores it, which is also how a device recognizes its own card. */
export async function hashAuthToken(authToken: string) {
	const token = fromBase64Url(authToken);
	if (!token) throw new UnreadableError();
	return hashToken(token);
}

/** A new card secret. */
export function createSecret() {
	return randomBytes(SECRET_BYTES);
}

/**
 * Derives a card's two independent values: the auth token, which is sent to the server, and the unlock
 * key, which opens the credential's wrapped key and never leaves the device.
 */
export async function deriveCredential(secret: Uint8Array<ArrayBuffer>) {
	if (secret.length !== SECRET_BYTES) throw new UnreadableError();
	const base = await crypto.subtle.importKey('raw', secret, 'HKDF', false, [
		'deriveBits',
		'deriveKey'
	]);
	const hkdf = (label: string) => ({
		name: 'HKDF',
		hash: 'SHA-256',
		salt: new Uint8Array(),
		info: encoder.encode(label)
	});
	const [authToken, unlockKey] = await Promise.all([
		crypto.subtle.deriveBits(hkdf(cardLabels.auth), base, AUTH_TOKEN_BYTES * 8),
		crypto.subtle.deriveKey(hkdf(cardLabels.unlock), base, aesGcm, false, ['encrypt', 'decrypt'])
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

/**
 * Encrypts bytes too big to carry as text, such as a photo, in envelope format 1's binary form: the format
 * in one byte, the IV, then the ciphertext ending in its tag, with the same additional data as text.
 */
export async function encryptBytes(
	bytes: Uint8Array<ArrayBuffer>,
	key: CryptoKey,
	context: DataContext
) {
	const { iv, ciphertext } = await encrypt(bytes, key, context);
	const sealed = new Uint8Array(1 + IV_BYTES + ciphertext.length);
	sealed.set([ENVELOPE_FORMAT]);
	sealed.set(iv, 1);
	sealed.set(ciphertext, 1 + IV_BYTES);
	return sealed;
}

/** Decrypts bytes in envelope format 1's binary form. Anyone holding the key could have written them. */
export async function decryptBytes(
	sealed: Uint8Array<ArrayBuffer>,
	key: CryptoKey,
	context: DataContext
) {
	if (sealed[0] !== ENVELOPE_FORMAT || sealed.length < SEALED_BYTES_OVERHEAD) {
		throw new UnreadableError();
	}
	return decrypt(sealed.slice(1, 1 + IV_BYTES), sealed.slice(1 + IV_BYTES), key, context);
}

/** How many bytes a value in envelope form holds, for the server, which checks envelopes it can't open. */
export function envelopeSize(value: unknown) {
	const envelope = parseEnvelope(value);
	return envelope && envelope.ciphertext.length - TAG_BYTES;
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
	if (kinds.size !== 1) {
		throw new TypeError('Wrap a key for at least one recipient, as one kind of key');
	}
}

// Envelope format 1: `1.<iv>.<ciphertext>` in base64url. AES-256-GCM with a fresh 96-bit IV, the 128-bit
// tag at the end of the ciphertext, and the record's context as additional authenticated data.
const envelopePattern = /^1\.([\w-]{16})\.([\w-]{22,})$/;

function parseEnvelope(value: unknown) {
	const parts = typeof value === 'string' ? envelopePattern.exec(value) : null;
	const iv = parts && fromBase64Url(parts[1]);
	const ciphertext = parts && fromBase64Url(parts[2]);
	return iv && ciphertext ? { iv, ciphertext } : undefined;
}

async function encrypt(plaintext: BufferSource, key: CryptoKey, context: KeyContext | DataContext) {
	const iv = randomBytes(IV_BYTES);
	const ciphertext = await crypto.subtle.encrypt(
		{ name: 'AES-GCM', iv, additionalData: additionalData(context) },
		key,
		plaintext
	);
	return { iv, ciphertext: new Uint8Array(ciphertext) };
}

async function decrypt(
	iv: BufferSource,
	ciphertext: BufferSource,
	key: CryptoKey,
	context: KeyContext | DataContext
) {
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

async function seal(
	plaintext: Uint8Array<ArrayBuffer>,
	key: CryptoKey,
	context: KeyContext | DataContext
) {
	const { iv, ciphertext } = await encrypt(plaintext, key, context);
	return `${ENVELOPE_FORMAT}.${toBase64Url(iv)}.${toBase64Url(ciphertext)}`;
}

async function open(envelope: string, key: CryptoKey, context: KeyContext | DataContext) {
	const parts = parseEnvelope(envelope);
	if (!parts) throw new UnreadableError();
	return decrypt(parts.iv, parts.ciphertext, key, context);
}

// Binds an envelope to its record: format, purpose, the classroom of a classroom record, and the
// credential, family, teacher, child, notice, or photo it belongs to. Moved to any other record, even one
// encrypted with the same key, it doesn't open.
function additionalData(context: KeyContext | DataContext) {
	const ids: {
		classroom?: string;
		credential?: string;
		family?: string;
		teacher?: string;
		child?: string;
		notice?: string;
		photo?: string;
	} = context;
	const subject =
		ids.credential ?? ids.family ?? ids.teacher ?? ids.child ?? ids.notice ?? ids.photo ?? null;
	return encoder.encode(
		JSON.stringify([
			'BubbleBoard',
			ENVELOPE_FORMAT,
			context.purpose,
			ids.classroom ?? null,
			subject
		])
	);
}
