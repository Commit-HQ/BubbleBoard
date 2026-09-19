import { expect, it } from 'vitest';
import { fromBase64Url, toBase64Url } from '$lib/base64url';
import { pushKind, pushKinds } from '$lib/push';
import {
	createVapidSecret,
	encryptKind,
	isPushEndpoint,
	pushKey,
	vapidAuthorization,
	vapidKey
} from './push';
import { deliver, type PushMessage, type PushEnv } from './push';

// Signing pushes, what they carry, and choosing where they may go. Delivery against the database is in
// catalog.test.ts.

/** A device as a browser makes one: the key pushes are encrypted to, and the secret they're salted with. */
async function newDevice() {
	const keys = (await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, [
		'deriveBits'
	])) as CryptoKeyPair;
	const publicKey = new Uint8Array(await crypto.subtle.exportKey('raw', keys.publicKey));
	const authSecret = crypto.getRandomValues(new Uint8Array(16));
	return {
		privateKey: keys.privateKey,
		publicKey,
		endpoint: 'https://web.push.apple.com/QGuQyavXutnMH6Ll',
		p256dh: toBase64Url(publicKey),
		auth: toBase64Url(authSecret)
	};
}

/**
 * Reads a push the way a browser does (RFC 8291, RFC 8188), written out here rather than shared with the
 * code that sends it, so a mistake in either one shows.
 */
async function readPush(
	device: Awaited<ReturnType<typeof newDevice>>,
	body: Uint8Array<ArrayBuffer>
) {
	const view = new DataView(body.buffer, body.byteOffset, body.byteLength);
	const [salt, keyLength] = [body.subarray(0, 16), view.getUint8(20)];
	const senderKey = body.subarray(21, 21 + keyLength);
	const sealed = body.subarray(21 + keyLength);
	const bytes = (text: string) => new Uint8Array([...new TextEncoder().encode(text), 0]);
	const derive = async (
		salt: Uint8Array<ArrayBuffer>,
		secret: Uint8Array<ArrayBuffer>,
		info: Uint8Array<ArrayBuffer>,
		length: number
	) => {
		const key = await crypto.subtle.importKey('raw', secret, 'HKDF', false, ['deriveBits']);
		return new Uint8Array(
			await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, length * 8)
		);
	};
	const sender = await crypto.subtle.importKey(
		'raw',
		senderKey,
		{ name: 'ECDH', namedCurve: 'P-256' },
		false,
		[]
	);
	const shared = new Uint8Array(
		await crypto.subtle.deriveBits({ name: 'ECDH', public: sender }, device.privateKey, 256)
	);
	const info = new Uint8Array([...bytes('WebPush: info'), ...device.publicKey, ...senderKey]);
	const secret = await derive(fromBase64Url(device.auth)!, shared, info, 32);
	const [contentKey, nonce] = await Promise.all([
		derive(salt, secret, bytes('Content-Encoding: aes128gcm'), 16),
		derive(salt, secret, bytes('Content-Encoding: nonce'), 12)
	]);
	const aes = await crypto.subtle.importKey('raw', contentKey, 'AES-GCM', false, ['decrypt']);
	const plain = new Uint8Array(
		await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, aes, sealed)
	);
	// The record ends with the byte that says no more follow.
	expect(plain.at(-1)).toBe(2);
	return new TextDecoder().decode(plain.subarray(0, -1));
}

it('says what happened in a push only the device it’s for can read', async () => {
	const device = await newDevice();

	for (const kind of pushKinds) {
		const body = await encryptKind(device, kind);
		expect(pushKind(await readPush(device, body))).toBe(kind);
	}
});

it('sends every kind in the same number of bytes, so its size says nothing', async () => {
	const device = await newDevice();
	const sizes = new Set<number>();
	for (const kind of pushKinds) sizes.add((await encryptKind(device, kind)).length);
	expect(sizes.size).toBe(1);
});

it('reads as a notice on a device that hasn’t sent the keys to encrypt to', async () => {
	const device = await newDevice();
	for (const missing of [
		{ ...device, p256dh: null },
		{ ...device, auth: null },
		{ ...device, p256dh: toBase64Url(new Uint8Array(64)) },
		{ ...device, auth: toBase64Url(new Uint8Array(8)) }
	]) {
		expect((await encryptKind(missing, 'booking')).length).toBe(0);
	}
	expect(pushKind(undefined)).toBe('notice');
});

it('keeps valid browser keys and refuses invalid curve points of the right length', async () => {
	const device = await newDevice();
	expect(await pushKey(device.p256dh, 65)).toBe(device.p256dh);
	expect(await pushKey(device.auth, 16)).toBe(device.auth);
	expect(await pushKey(toBase64Url(new Uint8Array(65)), 65)).toBe(null);
	const offCurve = new Uint8Array(65);
	offCurve[0] = 4;
	expect(await pushKey(toBase64Url(offCurve), 65)).toBe(null);
	expect(await pushKey(toBase64Url(new Uint8Array(64)), 65)).toBe(null);
	expect(await pushKey('not base64url!', 16)).toBe(null);
	expect(await pushKey(undefined, 16)).toBe(null);
	expect(await pushKey(42, 16)).toBe(null);
});

it('isolates a stored invalid key while delivering and acknowledging the rest of the batch', async () => {
	const good = await newDevice();
	const bad = {
		...good,
		endpoint: 'https://web.push.apple.com/bad',
		p256dh: toBase64Url(new Uint8Array(65))
	};
	let acknowledged = false;
	const sent: string[] = [];
	const retries: unknown[] = [];
	const body: PushMessage = {
		devices: [bad, good],
		kind: 'message',
		subject: 'https://example.com',
		attempt: 0
	};
	await deliver(
		{
			messages: [
				{
					body,
					ack: () => {
						acknowledged = true;
					}
				}
			]
		} as unknown as MessageBatch<PushMessage>,
		{
			VAPID_KEY: await createVapidSecret(),
			NOTIFICATIONS: {
				send: async (value: unknown) => {
					retries.push(value);
				}
			}
		} as unknown as PushEnv,
		(async (url: string) => {
			sent.push(url);
			return new Response(null, { status: 201 });
		}) as typeof fetch
	);
	expect(acknowledged).toBe(true);
	expect(sent).toEqual([good.endpoint]);
	expect(retries).toEqual([]);
});

it('signs a push service’s authorization for its origin, verifiable with the key devices subscribe with', async () => {
	const key = await vapidKey(await createVapidSecret());
	const now = Date.UTC(2026, 8, 13);
	const header = await vapidAuthorization(
		key,
		'https://web.push.apple.com/QGuQyavXutnMH6Ll',
		'https://bubbleboard.example.com',
		now
	);

	const [, token, publicKey] = /^vapid t=([^,]+), k=(.+)$/.exec(header)!;
	expect(publicKey).toBe(key.publicKey);
	const [head, claims, signature] = token.split('.');
	const read = (part: string) => JSON.parse(new TextDecoder().decode(fromBase64Url(part)));
	expect(read(head)).toEqual({ typ: 'JWT', alg: 'ES256' });
	expect(read(claims)).toEqual({
		aud: 'https://web.push.apple.com',
		exp: now / 1000 + 12 * 60 * 60,
		sub: 'https://bubbleboard.example.com'
	});
	const verifier = await crypto.subtle.importKey(
		'raw',
		fromBase64Url(publicKey)!,
		{ name: 'ECDSA', namedCurve: 'P-256' },
		false,
		['verify']
	);
	const signed = new TextEncoder().encode(`${head}.${claims}`);
	expect(
		await crypto.subtle.verify(
			{ name: 'ECDSA', hash: 'SHA-256' },
			verifier,
			fromBase64Url(signature)!,
			signed
		)
	).toBe(true);
});

it('sends pushes only to the push services browsers use', () => {
	for (const endpoint of [
		'https://fcm.googleapis.com/fcm/send/abc',
		'https://updates.push.services.mozilla.com/wpush/v2/abc',
		'https://web.push.apple.com/abc',
		'https://wns2-par02p.notify.windows.com/w/?token=abc'
	]) {
		expect(isPushEndpoint(endpoint), endpoint).toBe(true);
	}
	for (const endpoint of [
		'http://fcm.googleapis.com/fcm/send/abc',
		'https://fcm.googleapis.com.example.com/abc',
		'https://example.com/fcm.googleapis.com',
		'https://notfcm.googleapis.com.example.com/abc',
		'https://localhost/abc',
		'not a url',
		42
	]) {
		expect(isPushEndpoint(endpoint), String(endpoint)).toBe(false);
	}
});
