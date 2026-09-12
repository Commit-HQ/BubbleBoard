// Base64url without padding (RFC 4648 §5), for auth tokens, record IDs, and envelopes.

export function toBase64Url(bytes: Uint8Array): string {
	let binary = '';
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

/** Decodes base64url, or returns undefined unless `text` is the one canonical spelling of its bytes. */
export function fromBase64Url(text: string): Uint8Array<ArrayBuffer> | undefined {
	if (!/^[\w-]*$/.test(text) || text.length % 4 === 1) return undefined;
	const binary = atob(text.replaceAll('-', '+').replaceAll('_', '/'));
	const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
	return toBase64Url(bytes) === text ? bytes : undefined;
}
