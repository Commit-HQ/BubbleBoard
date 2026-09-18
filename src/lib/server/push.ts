import type { RequestEvent } from '@sveltejs/kit';
import { fromBase64Url, toBase64Url } from '../base64url';

// Notifications for new notices and board photos: Web Push without content (RFC 8030), signed with the
// installation's VAPID key (RFC 8292). A push only wakes the service worker, which shows the same words every
// time, so the server encrypts no payload and a push service learns nothing about a notice or photo. Posting
// puts the devices to notify on a queue, in groups one Worker invocation can send, and the queue handler
// sends them (worker/index.js). Imports stay relative: Wrangler bundles this for that handler without SvelteKit.

/** A queue message: the devices to notify, and how many times this group was tried before. */
export type PushMessage = {
	endpoints: string[];
	subject: string;
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

/** Keeps a device's subscription with the session that sent it, moving it from an earlier session. */
export async function subscribe(db: D1Database, endpoint: string, session: string) {
	// A subscription that's already with this session isn't written again.
	await db
		.prepare(
			`INSERT INTO push_subscriptions (endpoint, session_hash) VALUES (?1, ?2)
			ON CONFLICT (endpoint) DO UPDATE SET session_hash = ?2 WHERE session_hash <> ?2`
		)
		.bind(endpoint, session)
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

/** The installation's VAPID key, from its secret: the key's x, y, and d in base64url, joined by dots. */
export async function vapidKey(secret: string): Promise<VapidKey> {
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
 * Notifies the families and teachers of classrooms about a new notice or board photo, except the device that
 * posted it, by putting them on the queue in groups, signed for this installation's address. Without a
 * queue, as in `vite dev`, nothing is sent.
 */
export async function announce(
	event: RequestEvent,
	classrooms: string[],
	poster: string | undefined
) {
	const env = event.platform?.env;
	if (!env?.NOTIFICATIONS) return;
	const endpoints = await recipients(env.DB, classrooms, poster);
	const subject = event.url.origin;
	const messages: { body: PushMessage }[] = [];
	for (let start = 0; start < endpoints.length; start += groupSize) {
		messages.push({
			body: { endpoints: endpoints.slice(start, start + groupSize), subject, attempt: 0 }
		});
	}
	// A batch takes at most 100 messages.
	for (let start = 0; start < messages.length; start += 100) {
		await env.NOTIFICATIONS.sendBatch(messages.slice(start, start + 100));
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
		const eligible = new Set(
			message.body.conversation
				? await conversationRecipients(env.DB, message.body.conversation)
				: []
		);
		const { subject, attempt, conversation } = message.body;
		const endpoints = conversation
			? message.body.endpoints.filter((endpoint) => eligible.has(endpoint))
			: message.body.endpoints;
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
			const next: PushMessage = {
				endpoints: again,
				subject,
				attempt: attempt + 1,
				...(conversation ? { conversation } : {})
			};
			await env.NOTIFICATIONS.send(next, { delaySeconds: 60 * 2 ** attempt });
		}
		message.ack();
	}
}

/** Private conversations notify only their family and assigned teachers, never other families. */
export async function conversationRecipients(
	db: D1Database,
	conversation: string,
	poster = '',
	now = Date.now()
) {
	const { results } = await db
		.prepare(
			`SELECT p.endpoint FROM push_subscriptions p
 JOIN sessions s ON s.token_hash=p.session_hash JOIN credentials c ON c.id=s.credential_id
 JOIN conversations t ON t.id=?
 WHERE s.expires_at>? AND p.session_hash<>? AND (
 c.family_id=t.family_id OR c.teacher_id IN (SELECT teacher_id FROM teacher_classrooms WHERE classroom_id=t.classroom_id))`
		)
		.bind(conversation, now, poster)
		.all<{ endpoint: string }>();
	return results.map(({ endpoint }) => endpoint);
}
export async function announceConversation(
	event: RequestEvent,
	conversation: string,
	poster: string | undefined
) {
	const env = event.platform?.env;
	if (!env?.NOTIFICATIONS) return;
	const endpoints = await conversationRecipients(env.DB, conversation, poster);
	for (let offset = 0; offset < endpoints.length; offset += groupSize) {
		await env.NOTIFICATIONS.send({
			endpoints: endpoints.slice(offset, offset + groupSize),
			subject: event.url.origin,
			attempt: 0,
			conversation
		} satisfies PushMessage);
	}
}

/** Booking changes notify the child's families and the classroom's teachers; names never leave devices. */
export async function announceMeeting(
	event: RequestEvent,
	offer: string,
	child: string,
	poster?: string
) {
	return announceMeetingChanges(event, [{ offer, child }], poster);
}

/** One notification per device, even when a whole day cancels several reservations. */
export async function announceMeetingChanges(
	event: RequestEvent,
	changes: { offer: string; child: string }[],
	poster?: string
) {
	if (!changes.length) return;
	const env = event.platform?.env;
	if (!env?.NOTIFICATIONS) return;
	const { results } = await env.DB.prepare(
		`SELECT DISTINCT p.endpoint FROM push_subscriptions p
 JOIN sessions s ON s.token_hash=p.session_hash JOIN credentials c ON c.id=s.credential_id
 JOIN json_each(?) changed JOIN meeting_offers o ON o.id=json_extract(changed.value,'$.offer') WHERE s.expires_at>? AND p.session_hash<>? AND (
 c.family_id IN(SELECT i.family_id FROM meeting_invites i JOIN family_classrooms f ON f.family_id=i.family_id AND f.classroom_id=o.classroom_id WHERE i.offer_id=o.id AND i.child_id=json_extract(changed.value,'$.child'))
 OR c.teacher_id IN(SELECT teacher_id FROM teacher_classrooms WHERE classroom_id=o.classroom_id))`
	)
		.bind(JSON.stringify(changes), Date.now(), poster ?? '')
		.all<{ endpoint: string }>();
	for (let offset = 0; offset < results.length; offset += groupSize)
		await env.NOTIFICATIONS.send({
			endpoints: results.slice(offset, offset + groupSize).map((r) => r.endpoint),
			subject: event.url.origin,
			attempt: 0
		} satisfies PushMessage);
}
