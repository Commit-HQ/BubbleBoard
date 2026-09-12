import { SECRET_BYTES } from '$lib/crypto';
import type { Locale } from '$lib/i18n';
import { appPath } from '$lib/paths';

// Card format 1: a card's 128-bit secret as 28 characters of Crockford's base32 alphabet, the last two
// a check. The same code is printed on the card and carried in its QR link. Printed cards must keep
// working, so this format never changes; a new one gets a new fragment name (docs/access-format.md).

const alphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const secretSymbols = 26;

export type CardReading =
	{ secret: Uint8Array<ArrayBuffer> } | { error: 'invalid' | 'mistyped' | 'other-installation' };

/** The code printed on a card, in groups of four: `K7Q2-M9PX-3HDR-W8TN-6CJV-ABQE-4RZ5`. */
export function formatCardCode(secret: Uint8Array) {
	const symbols = toSymbols(secret);
	return [...symbols, ...checkSymbols(symbols)]
		.map((value) => alphabet[value])
		.join('')
		.replace(/(.{4})(?!$)/g, '$1-');
}

/** The link in a card's QR code. The code is in the fragment, which browsers never send to a server. */
export function cardLink(origin: string, locale: Locale, secret: Uint8Array) {
	return `${origin}${appPath(locale)}#card=${formatCardCode(secret).replaceAll('-', '')}`;
}

/**
 * Reads a card from a scanned link or a typed code. A link counts only by its origin and fragment, so a
 * card works in either language and keeps working if app paths change.
 */
export function readCard(text: string, origin: string): CardReading {
	const input = text.trim();
	if (!URL.canParse(input)) return readCode(input);
	const url = new URL(input);
	const fields = [...new URLSearchParams(url.hash.slice(1))];
	if (fields.length !== 1 || fields[0][0] !== 'card') return { error: 'invalid' };
	const reading = readCode(fields[0][1]);
	return 'error' in reading || url.origin === origin ? reading : { error: 'other-installation' };
}

// Accepts lowercase, spaces, and dashes, and reads the look-alikes O, I, and L as 0, 1, and 1.
function readCode(text: string): CardReading {
	const code = text.toUpperCase().replace(/[\s-]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1');
	if (!new RegExp(`^[${alphabet}]{${secretSymbols + 2}}$`).test(code)) return { error: 'invalid' };
	const values = [...code].map((char) => alphabet.indexOf(char));
	const symbols = values.slice(0, secretSymbols);
	const [first, second] = checkSymbols(symbols);
	if (values[secretSymbols] !== first || values[secretSymbols + 1] !== second) {
		return { error: 'mistyped' };
	}
	const secret = fromSymbols(symbols);
	return secret ? { secret } : { error: 'invalid' };
}

function toSymbols(bytes: Uint8Array) {
	const symbols: number[] = [];
	let buffer = 0;
	let bits = 0;
	for (const byte of bytes) {
		buffer = ((buffer << 8) | byte) & 0xfff;
		bits += 8;
		while (bits >= 5) {
			bits -= 5;
			symbols.push((buffer >> bits) & 31);
		}
	}
	if (bits) symbols.push((buffer << (5 - bits)) & 31);
	return symbols;
}

function fromSymbols(symbols: number[]) {
	const bytes = new Uint8Array(SECRET_BYTES);
	let buffer = 0;
	let bits = 0;
	let index = 0;
	for (const symbol of symbols) {
		buffer = ((buffer << 5) | symbol) & 0xfff;
		bits += 5;
		if (bits >= 8) {
			bits -= 8;
			bytes[index++] = (buffer >> bits) & 255;
		}
	}
	// The last symbol's spare bits must be zero, so every secret has exactly one code.
	return buffer & ((1 << bits) - 1) ? undefined : bytes;
}

// A position-weighted sum modulo the prime 1021, as two symbols. It catches any one mistyped character
// and any swap of two secret characters: no value difference times a weight or weight difference reaches
// 1021, so none of them leaves the sum unchanged.
function checkSymbols(symbols: number[]) {
	const sum = symbols.reduce((total, value, index) => (total + (index + 1) * value) % 1021, 0);
	return [sum >> 5, sum & 31];
}
