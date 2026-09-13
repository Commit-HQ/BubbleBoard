import { expect, it } from 'vitest';
import { fromBase64Url } from '$lib/base64url';
import { createVapidSecret, isPushEndpoint, vapidAuthorization, vapidKey } from './push';

// Signing pushes and choosing where they may go. Delivery against the database is in catalog.test.ts.

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
