import { fromBase64Url, toBase64Url } from '../base64url';

// Notifications for new notices: Web Push without content (RFC 8030), signed with the installation's VAPID
// key (RFC 8292). A push only wakes the service worker, which shows the same words for every notice, so the
// server encrypts no payload and a push service learns nothing about a notice. Posting puts the devices to
// notify on a queue, in groups one Worker invocation can send, and the queue handler sends them
// (worker/index.js). Imports stay relative: Wrangler bundles this for that handler without SvelteKit.

/** A queue message: the devices to notify, and how many times this group was tried before. */
export type PushMessage = { endpoints: string[]; subject: string; attempt: number };
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

/** The installation's VAPID key, from its secret: the key's x, y, and d in base64url, joined by dots. */
export async function vapidKey(secret: string): Promise<VapidKey> {
	const [x = '', y = '', d = ''] = secret.split('.');
	const [xBytes, yBytes] = [fromBase64Url(x), fromBase64Url(y)];
	if (xBytes?.length !== 32 || yBytes?.length !== 32)
		throw new Error('VAPID_KEY is not a P-256 key');
	const privateKey = await crypto.subtle.importKey(
		'jwk',
		{ kty: 'EC', crv: 'P-256', x, y, d },
		{ name: 'ECDSA', namedCurve: 'P-256' },
		false,
		['sign']
	);
	// The public key as devices subscribe with it: an uncompressed point.
	const point = new Uint8Array(65);
	point.set([4]);
	point.set(xBytes, 1);
	point.set(yBytes, 33);
	return { privateKey, publicKey: toBase64Url(point) };
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

/**
 * The devices that turned on notifications for a notice's classrooms: families in them and the teachers
 * assigned to them, except the device that posted it. Admins hear only about the classrooms they teach.
 */
export async function recipients(
	db: D1Database,
	classrooms: string[],
	poster: string | undefined,
	now = Date.now()
) {
	const { results } = await db
		.prepare(
			`SELECT p.endpoint FROM push_subscriptions p
			JOIN sessions s ON s.token_hash = p.session_hash
			JOIN credentials c ON c.id = s.credential_id
			WHERE s.expires_at > ?1 AND p.session_hash <> ?2 AND (
				c.family_id IN (SELECT family_id FROM family_classrooms WHERE classroom_id IN (SELECT value FROM json_each(?3)))
				OR c.teacher_id IN (SELECT teacher_id FROM teacher_classrooms WHERE classroom_id IN (SELECT value FROM json_each(?3)))
			)`
		)
		.bind(now, poster ?? '', JSON.stringify(classrooms))
		.all<{ endpoint: string }>();
	return results.map(({ endpoint }) => endpoint);
}

/**
 * Notifies a notice's families and teachers, except the device that posted it, by putting them on the queue
 * in groups. Without a queue, as in `vite dev`, nothing is sent.
 */
export async function announce(
	db: D1Database,
	queue: Queue | undefined,
	classrooms: string[],
	poster: string | undefined,
	subject: string
) {
	if (!queue) return;
	const endpoints = await recipients(db, classrooms, poster);
	const messages: { body: PushMessage }[] = [];
	for (let start = 0; start < endpoints.length; start += groupSize) {
		messages.push({
			body: { endpoints: endpoints.slice(start, start + groupSize), subject, attempt: 0 }
		});
	}
	// A batch takes at most 100 messages.
	for (let start = 0; start < messages.length; start += 100) {
		await queue.sendBatch(messages.slice(start, start + 100));
	}
}

type Outcome = 'sent' | 'gone' | 'again' | 'refused';

async function push(
	endpoint: string,
	authorization: string,
	fetcher: typeof fetch
): Promise<Outcome> {
	try {
		const response = await fetcher(endpoint, {
			method: 'POST',
			// Topic lets a push service keep only the latest of the pushes a device hasn't picked up yet.
			headers: {
				Authorization: authorization,
				TTL: String(day),
				Urgency: 'normal',
				Topic: 'notice'
			},
			body: new Uint8Array()
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
		const { endpoints, subject, attempt } = message.body;
		const signed = new Map<string, Promise<string>>();
		const outcomes = await Promise.all(
			endpoints.map(async (endpoint) => {
				const { origin } = new URL(endpoint);
				if (!signed.has(origin)) signed.set(origin, vapidAuthorization(key, endpoint, subject));
				return { endpoint, outcome: await push(endpoint, await signed.get(origin)!, fetcher) };
			})
		);
		const having = (wanted: Outcome) =>
			outcomes.filter(({ outcome }) => outcome === wanted).map(({ endpoint }) => endpoint);
		const [gone, again] = [having('gone'), having('again')];
		if (gone.length) {
			await env.DB.prepare(
				'DELETE FROM push_subscriptions WHERE endpoint IN (SELECT value FROM json_each(?))'
			)
				.bind(JSON.stringify(gone))
				.run();
		}
		if (again.length && attempt + 1 < attempts) {
			const next: PushMessage = { endpoints: again, subject, attempt: attempt + 1 };
			await env.NOTIFICATIONS.send(next, { delaySeconds: 60 * 2 ** attempt });
		}
		message.ack();
	}
}

/** The daily cleanup: notices past their days, and sessions that ran out, with their subscriptions. */
export function cleanUp(db: D1Database, now = Date.now()) {
	return db.batch([
		db.prepare('DELETE FROM notices WHERE expires_at <= ?').bind(now),
		db.prepare('DELETE FROM sessions WHERE expires_at <= ?').bind(now)
	]);
}
