import { expect, it } from 'vitest';
import { fromBase64Url, toBase64Url } from './base64url';

it('round-trips every byte value and length', () => {
	const bytes = Uint8Array.from({ length: 256 }, (_, i) => i);
	for (let length = 0; length <= bytes.length; length++) {
		const slice = bytes.slice(0, length);
		const text = toBase64Url(slice);
		expect(text).toMatch(/^[\w-]*$/);
		expect(fromBase64Url(text)).toEqual(slice);
	}
});

it('accepts only the canonical spelling', () => {
	// Padding, the standard alphabet, an impossible length, unused bits set, and whitespace.
	for (const text of ['AA==', 'a+/b', 'AAAAA', 'AB', 'AA A']) {
		expect(fromBase64Url(text), text).toBeUndefined();
	}
});
