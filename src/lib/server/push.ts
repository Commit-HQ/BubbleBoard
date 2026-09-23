import type { RequestEvent } from '@sveltejs/kit';
import type { Staff } from '../api';
import { fromBase64Url, toBase64Url } from '../base64url';
import { pushCode, type PushKind } from '../push';
import { transaction } from './database';
import type { Head } from './session';

// Notifications for new notices, board photos, messages and meeting times: Web Push (RFC 8030), signed with
// the installation's VAPID key (RFC 8292). A push carries one letter saying which of those happened,
// encrypted for the one device it's going to (RFC 8291), so a push service carries it without being able to
// read it and learns nothing about a notice, a message, or a child. The words themselves never leave the
// device: the service worker holds them. Posting puts the devices to notify on a queue, in groups one Worker
// invocation can send, and the queue handler sends them (worker/index.js). Imports stay relative: Wrangler
// bundles this for that handler without SvelteKit's path aliases.

/** Where to push, and the keys the device's browser made, which are empty until its app sends them. */
export type PushDevice = { endpoint: string; p256dh: string | null; auth: string | null };
/** A queue message: the devices to notify, what happened, and how many times this group was tried before. */
export type PushMessage = {
	devices: PushDevice[];
	subject: string;
	kind: PushKind;
	attempt: number;
	conversation?: string;
};
export type PushEnv = { DB: D1Database; NOTIFICATIONS: Queue; VAPID_KEY: string };
type VapidKey = { privateKey: CryptoKey; publicKey: string };

/** The push services browsers subscribe with. Requests go only to these, never to any address a device names. */
const pushServices = [
	'fcm.googleapis.com',
	'push.services.mozilla.com',
	'web.push.apple.com',
	'notify.windows.com'
];
/** Devices in one queue message: with a database write and a queue send, below the Free plan's 50 outgoing requests an invocation. */
const groupSize = 40;
const attempts = 5;
const day = 24 * 60 * 60;

export function isPushEndpoint(value: unknown): value is string {
	if (typeof value !== 'string' || value.length > 1024 || !URL.canParse(value)) return false;
	const { protocol, hostname } = new URL(value);
	return (
		protocol === 'https:' &&
		pushServices.some((service) => hostname === service || hostname.endsWith(`.${service}`))
	);
}

/** Validate browser keys, including the public key's curve point; invalid keys leave pushes empty. */
export async function pushKey(value: unknown, bytes: number) {
	if (typeof value !== 'string') return null;
	const raw = fromBase64Url(value);
	if (raw?.length !== bytes) return null;
	if (bytes === 65) {
		try {
			await crypto.subtle.importKey('raw', raw, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
		} catch {
			return null;
		}
	}
	return value;
}

/** Keeps a device's subscription with the session that sent it, moving it from an earlier session. */
export async function subscribe(db: D1Database, device: PushDevice, session: string) {
	// A subscription already with this session, by these keys, isn't written again. `IS NOT` compares keys
	// that aren't there, which is what a device subscribed before this installation stored them has.
	await db
		.prepare(
			`INSERT INTO push_subscriptions (endpoint, session_hash, p256dh, auth) VALUES (?1, ?2, ?3, ?4)
			ON CONFLICT (endpoint) DO UPDATE SET session_hash = ?2, p256dh = ?3, auth = ?4
			WHERE session_hash <> ?2 OR p256dh IS NOT ?3 OR auth IS NOT ?4`
		)
		.bind(device.endpoint, session, device.p256dh, device.auth)
		.run();
}

/** Forgets the subscription of a session's device, which turns its notifications off. */
export async function unsubscribe(db: D1Database, session: string) {
	await db.prepare('DELETE FROM push_subscriptions WHERE session_hash = ?').bind(session).run();
}

/** A new secret for the installation's VAPID key, in the form `vapidKey` reads, as scripts/push-key.js makes. */
export async function createVapidSecret() {
	const { privateKey } = await crypto.subtle.generateKey(
		{ name: 'ECDSA', namedCurve: 'P-256' },
		true,
		['sign', 'verify']
	);
	const { x, y, d } = await crypto.subtle.exportKey('jwk', privateKey);
	return `${x}.${y}.${d}`;
}

/** The public key devices subscribe with, from the installation's secret: its x and y as an uncompressed point. */
export function vapidPublicKey(secret: string) {
	const [x = '', y = ''] = secret.split('.');
	const [xBytes, yBytes] = [fromBase64Url(x), fromBase64Url(y)];
	if (xBytes?.length !== 32 || yBytes?.length !== 32)
		throw new Error('VAPID_KEY is not a P-256 key');
	const point = new Uint8Array(65);
	point.set([4]);
	point.set(xBytes, 1);
	point.set(yBytes, 33);
	return toBase64Url(point);
}

/**
 * The installation's VAPID key, from its secret: the key's x, y, and d in base64url, joined by dots. It's
 * the same key on every push, so it's imported once and kept for as long as the Worker lives.
 */
let imported: { secret: string; key: Promise<VapidKey> } | undefined;
export function vapidKey(secret: string): Promise<VapidKey> {
	if (imported?.secret !== secret) imported = { secret, key: importVapidKey(secret) };
	return imported.key;
}
async function importVapidKey(secret: string): Promise<VapidKey> {
	const publicKey = vapidPublicKey(secret);
	const [x, y, d] = secret.split('.');
	const privateKey = await crypto.subtle.importKey(
		'jwk',
		{ kty: 'EC', crv: 'P-256', x, y, d },
		{ name: 'ECDSA', namedCurve: 'P-256' },
		false,
		['sign']
	);
	return { privateKey, publicKey };
}

/** A push service's Authorization header, signed for its origin and good for twelve hours (RFC 8292 §2). */
export async function vapidAuthorization(
	key: VapidKey,
	endpoint: string,
	subject: string,
	now = Date.now()
) {
	const encoder = new TextEncoder();
	const part = (value: object) => toBase64Url(encoder.encode(JSON.stringify(value)));
	const claims = {
		aud: new URL(endpoint).origin,
		exp: Math.floor(now / 1000) + 12 * 60 * 60,
		sub: subject
	};
	const token = `${part({ typ: 'JWT', alg: 'ES256' })}.${part(claims)}`;
	const signature = await crypto.subtle.sign(
		{ name: 'ECDSA', hash: 'SHA-256' },
		key.privateKey,
		encoder.encode(token)
	);
	return `vapid t=${token}.${toBase64Url(new Uint8Array(signature))}, k=${key.publicKey}`;
}

/** Bytes WebCrypto takes: a view of an ArrayBuffer of its own, not of memory shared with another thread. */
type Bytes = Uint8Array<ArrayBuffer>;

const join = (...parts: Uint8Array[]): Bytes => {
	const all = new Uint8Array(parts.reduce((size, part) => size + part.length, 0));
	let at = 0;
	for (const part of parts) {
		all.set(part, at);
		at += part.length;
	}
	return all;
};
/** A label, which RFC 8188 ends with a zero byte. */
const label = (text: string) => join(new TextEncoder().encode(text), new Uint8Array([0]));
/** HKDF (RFC 5869), whose extract and expand WebCrypto does in the one step. */
async function hkdf(salt: Bytes, secret: Bytes, info: Bytes, bytes: number) {
	const key = await crypto.subtle.importKey('raw', secret, 'HKDF', false, ['deriveBits']);
	return new Uint8Array(
		await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, bytes * 8)
	);
}

/**
 * The letter for what happened, encrypted for one device (RFC 8291) in the aes128gcm encoding (RFC 8188).
 * The key comes from this message's own key agreed with the device's, so the push service carries a body it
 * can't read, and every letter is one byte, so every body is the same size. A device whose keys aren't
 * there yet gets an empty body, and its service worker shows the words for a notice.
 */
export async function encryptKind(device: PushDevice, kind: PushKind) {
	const theirPublic = fromBase64Url(device.p256dh ?? '');
	const authSecret = fromBase64Url(device.auth ?? '');
	if (theirPublic?.length !== 65 || authSecret?.length !== 16) return new Uint8Array();
	const salt = crypto.getRandomValues(new Uint8Array(16));
	const ours = (await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, [
		'deriveBits'
	])) as CryptoKeyPair;
	const ourPublic = new Uint8Array(await crypto.subtle.exportKey('raw', ours.publicKey));
	const theirs = await crypto.subtle.importKey(
		'raw',
		theirPublic,
		{ name: 'ECDH', namedCurve: 'P-256' },
		false,
		[]
	);
	const shared = new Uint8Array(
		await crypto.subtle.deriveBits({ name: 'ECDH', public: theirs }, ours.privateKey, 256)
	);
	// The secret binds to both devices' keys, so it's good for this one device only (RFC 8291 §3.3).
	const secret = await hkdf(
		authSecret,
		shared,
		join(label('WebPush: info'), theirPublic, ourPublic),
		32
	);
	const [contentKey, nonce] = await Promise.all([
		hkdf(salt, secret, label('Content-Encoding: aes128gcm'), 16),
		hkdf(salt, secret, label('Content-Encoding: nonce'), 12)
	]);
	const aes = await crypto.subtle.importKey('raw', contentKey, 'AES-GCM', false, ['encrypt']);
	// One record: the letter, then the byte that says no more records follow.
	const record = join(new TextEncoder().encode(pushCode(kind)), new Uint8Array([2]));
	const sealed = new Uint8Array(
		await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aes, record)
	);
	// The header the device reads the message with: the salt, the record size, and this message's key.
	const header = new Uint8Array(21);
	header.set(salt);
	new DataView(header.buffer).setUint32(16, 4096);
	header[20] = ourPublic.length;
	return join(header, ourPublic, sealed);
}

/**
 * The classrooms whose notifications a head turned off. Nobody else has any: a teacher or a group lead hears
 * about the classrooms she's assigned to, which she doesn't choose.
 */
export async function mutedClassrooms(db: D1Database, staff: Staff) {
	if (staff.role !== 'head') return [];
	const { results } = await db
		.prepare('SELECT classroom_id AS classroom FROM teacher_muted_classrooms WHERE teacher_id = ?')
		.bind(staff.teacher)
		.all<{ classroom: string }>();
	return results.map(({ classroom }) => classroom);
}

/**
 * Sets which classrooms a head hears nothing from, in place of her earlier choice. A classroom that isn't
 * there anymore means the device read the kindergarten before it was deleted, so it's told to read again.
 */
export async function setMutedClassrooms(db: D1Database, head: Head, classrooms: string[]) {
	// The foreign key refuses a classroom that's gone, which `transaction` answers as stale.
	await transaction(db, [
		db.prepare('DELETE FROM teacher_muted_classrooms WHERE teacher_id = ?').bind(head.teacher),
		db
			.prepare(
				'INSERT INTO teacher_muted_classrooms (teacher_id, classroom_id) SELECT ?, value FROM json_each(?)'
			)
			.bind(head.teacher, JSON.stringify(classrooms))
	]);
}

/**
 * Whether the credential `c` belongs to a head who hears about one of the classrooms in question, which
 * `classrooms` selects as a column named `classroom`. She hears about every one she didn't mute, so a
 * classroom made after her choice speaks up on its own.
 */
const headHears = (classrooms: string) =>
	`c.teacher_id IN (SELECT id FROM teachers WHERE role = 'head') AND EXISTS (
	SELECT 1 FROM (${classrooms}) WHERE classroom NOT IN
	(SELECT classroom_id FROM teacher_muted_classrooms WHERE teacher_id = c.teacher_id))`;

/**
 * The devices that turned on notifications for a notice's classrooms: families in them, the teachers
 * assigned to them, and the heads who didn't mute any of them, except the device that posted it.
 */
export async function recipients(
	db: D1Database,
	classrooms: string[],
	poster: string | undefined,
	now = Date.now()
) {
	const { results } = await db
		.prepare(
			`SELECT p.endpoint, p.p256dh, p.auth FROM push_subscriptions p
			JOIN sessions s ON s.token_hash = p.session_hash
			JOIN credentials c ON c.id = s.credential_id
			WHERE s.expires_at > ?1 AND p.session_hash <> ?2 AND (
				c.family_id IN (SELECT family_id FROM family_classrooms WHERE classroom_id IN (SELECT value FROM json_each(?3)))
				OR c.teacher_id IN (SELECT teacher_id FROM teacher_classrooms WHERE classroom_id IN (SELECT value FROM json_each(?3)))
				OR (${headHears('SELECT value AS classroom FROM json_each(?3)')})
			)`
		)
		.bind(now, poster ?? '', JSON.stringify(classrooms))
		.all<PushDevice>();
	return results;
}

/** Puts devices on the queue in groups, each saying what happened, signed for this installation's address. */
async function queue(
	event: RequestEvent,
	env: PushEnv,
	devices: PushDevice[],
	kind: PushKind,
	conversation?: string
) {
	const subject = event.url.origin;
	const messages: { body: PushMessage }[] = [];
	for (let start = 0; start < devices.length; start += groupSize) {
		messages.push({
			body: {
				devices: devices.slice(start, start + groupSize),
				subject,
				kind,
				attempt: 0,
				...(conversation ? { conversation } : {})
			}
		});
	}
	// A batch takes at most 100 messages.
	for (let start = 0; start < messages.length; start += 100) {
		await env.NOTIFICATIONS.sendBatch(messages.slice(start, start + 100));
	}
}

/**
 * Lets notifications go out after the response, so whoever made the change doesn't wait for them, and a
 * notification that couldn't be queued never fails a change that's already made.
 */
export function notifyLater(event: RequestEvent, sending: Promise<void>) {
	event.platform?.ctx.waitUntil(sending.catch(() => {}));
}

/**
 * Notifies the families and teachers of classrooms about a new notice or board photo, or meeting times they
 * can book, except the device that posted it. Without a queue, as in `vite dev`, nothing is sent.
 */
export async function announce(
	event: RequestEvent,
	classrooms: string[],
	poster: string | undefined,
	kind: PushKind = 'notice'
) {
	const env = event.platform?.env;
	if (!env?.NOTIFICATIONS) return;
	await queue(event, env, await recipients(env.DB, classrooms, poster), kind);
}

type Outcome = 'sent' | 'gone' | 'again' | 'refused';

async function push(
	device: PushDevice,
	kind: PushKind,
	authorization: string,
	fetcher: typeof fetch
): Promise<Outcome> {
	let body: Bytes;
	try {
		body = await encryptKind(device, kind);
	} catch {
		// A bad key already stored or queued must not retry successful deliveries to other devices.
		return 'refused';
	}
	try {
		const response = await fetcher(device.endpoint, {
			method: 'POST',
			// Topic lets a push service keep only the latest of the pushes a device hasn't picked up yet, and
			// it's the kind, so a message doesn't drop a cancelled meeting time a phone hasn't seen.
			headers: {
				Authorization: authorization,
				TTL: String(day),
				Urgency: 'normal',
				Topic: kind,
				...(body.length
					? { 'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream' }
					: {})
			},
			body
		});
		await response.body?.cancel();
		if (response.ok) return 'sent';
		if (response.status === 404 || response.status === 410) return 'gone';
		return response.status === 429 || response.status >= 500 ? 'again' : 'refused';
	} catch {
		return 'again';
	}
}

/**
 * The queue handler: sends a group's pushes, forgets devices their push service says are gone, and tries
 * busy push services again later, waiting longer each time. One message at a time (wrangler.jsonc).
 */
export async function deliver(
	batch: MessageBatch<PushMessage>,
	env: PushEnv,
	fetcher: typeof fetch = fetch
) {
	const key = await vapidKey(env.VAPID_KEY);
	for (const message of batch.messages) {
		const { subject, attempt, conversation, kind } = message.body;
		const eligible = new Set(
			(conversation ? await conversationRecipients(env.DB, conversation) : []).map(
				(device) => device.endpoint
			)
		);
		const devices = conversation
			? message.body.devices.filter((device) => eligible.has(device.endpoint))
			: message.body.devices;
		const signed = new Map<string, Promise<string>>();
		const outcomes = await Promise.all(
			devices.map(async (device) => {
				const { origin } = new URL(device.endpoint);
				if (!signed.has(origin))
					signed.set(origin, vapidAuthorization(key, device.endpoint, subject));
				return { device, outcome: await push(device, kind, await signed.get(origin)!, fetcher) };
			})
		);
		const having = (wanted: Outcome) =>
			outcomes.filter(({ outcome }) => outcome === wanted).map(({ device }) => device);
		const [gone, again] = [having('gone'), having('again')];
		if (gone.length) {
			await env.DB.prepare(
				'DELETE FROM push_subscriptions WHERE endpoint IN (SELECT value FROM json_each(?))'
			)
				.bind(JSON.stringify(gone.map(({ endpoint }) => endpoint)))
				.run();
		}
		if (again.length && attempt + 1 < attempts) {
			const next: PushMessage = {
				devices: again,
				subject,
				kind,
				attempt: attempt + 1,
				...(conversation ? { conversation } : {})
			};
			await env.NOTIFICATIONS.send(next, { delaySeconds: 60 * 2 ** attempt });
		}
		message.ack();
	}
}

/**
 * Private conversations notify only their family, the classroom's assigned teachers, and the heads who hear
 * about that classroom, never other families.
 */
export async function conversationRecipients(
	db: D1Database,
	conversation: string,
	poster = '',
	now = Date.now()
) {
	const { results } = await db
		.prepare(
			`SELECT p.endpoint, p.p256dh, p.auth FROM push_subscriptions p
 JOIN sessions s ON s.token_hash=p.session_hash JOIN credentials c ON c.id=s.credential_id
 JOIN conversations t ON t.id=?
 WHERE s.expires_at>? AND p.session_hash<>? AND (
 c.family_id=t.family_id OR c.teacher_id IN (SELECT teacher_id FROM teacher_classrooms WHERE classroom_id=t.classroom_id)
 OR (${headHears('SELECT t.classroom_id AS classroom')}))`
		)
		.bind(conversation, now, poster)
		.all<PushDevice>();
	return results;
}
export async function announceConversation(
	event: RequestEvent,
	conversation: string,
	poster: string | undefined
) {
	const env = event.platform?.env;
	if (!env?.NOTIFICATIONS) return;
	const devices = await conversationRecipients(env.DB, conversation, poster);
	await queue(event, env, devices, 'message', conversation);
}

/**
 * Booking changes notify the child's families, the classroom's teachers, and the heads who hear about that
 * classroom; names never leave devices. One notification per device, even when a whole day cancels several
 * reservations.
 */
export async function announceMeetingChanges(
	event: RequestEvent,
	changes: { offer: string; child: string }[],
	poster?: string
) {
	if (!changes.length) return;
	const env = event.platform?.env;
	if (!env?.NOTIFICATIONS) return;
	const { results } = await env.DB.prepare(
		`SELECT DISTINCT p.endpoint, p.p256dh, p.auth FROM push_subscriptions p
 JOIN sessions s ON s.token_hash=p.session_hash JOIN credentials c ON c.id=s.credential_id
 JOIN json_each(?) changed JOIN meeting_offers o ON o.id=json_extract(changed.value,'$.offer') WHERE s.expires_at>? AND p.session_hash<>? AND (
 c.family_id IN(SELECT i.family_id FROM meeting_invites i JOIN family_classrooms f ON f.family_id=i.family_id AND f.classroom_id=o.classroom_id WHERE i.offer_id=o.id AND i.child_id=json_extract(changed.value,'$.child'))
 OR c.teacher_id IN(SELECT teacher_id FROM teacher_classrooms WHERE classroom_id=o.classroom_id)
 OR (${headHears('SELECT o.classroom_id AS classroom')}))`
	)
		.bind(JSON.stringify(changes), Date.now(), poster ?? '')
		.all<PushDevice>();
	await queue(event, env, results, 'booking');
}
