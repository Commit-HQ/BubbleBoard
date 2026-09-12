import { fromBase64Url, toBase64Url } from '$lib/base64url';
import { SECRET_BYTES, type Role } from '$lib/crypto';
import { defaultLocale, isLocale, type Locale } from '$lib/i18n';

// Every path the site links to, and the card links it prints and reads. The default language, Croatian,
// has no prefix (`/`, `/app`); other languages do (`/en`, `/en/app`).

const prefix = (locale: Locale) => (locale === defaultLocale ? '' : `/${locale}`);

export function homePath(locale: Locale) {
	return prefix(locale) || '/';
}

export function appPath(locale: Locale) {
	return `${prefix(locale)}/app`;
}

/** The current page in another language, without the query or fragment: a fragment can hold a card. */
export function localizedPath(pathname: string, locale: Locale) {
	const [, first = '', rest = ''] = /^\/([^/]*)(.*)$/.exec(pathname) ?? [];
	const path = first !== defaultLocale && isLocale(first) ? rest : pathname;
	return `${prefix(locale)}${path === '/' ? '' : path}` || '/';
}

/** The link a card's QR code holds. The secret is in the fragment, which browsers never send. */
export function cardLink(origin: string, locale: Locale, role: Role, secret: Uint8Array) {
	return `${origin}${appPath(locale)}#${role}=${toBase64Url(secret)}`;
}

export type CardReading =
	{ role: Role; secret: Uint8Array<ArrayBuffer> } | { error: 'invalid' | 'other-installation' };

/**
 * Reads a card link from a scanned code or the address bar. Only its origin and fragment count, so a
 * card works in either language and keeps working if app paths change.
 */
export function readCardLink(text: string, origin: string): CardReading {
	if (!URL.canParse(text)) return { error: 'invalid' };
	const url = new URL(text);
	const fields = [...new URLSearchParams(url.hash.slice(1))];
	if (fields.length !== 1) return { error: 'invalid' };
	const [[role, value]] = fields;
	const secret = fromBase64Url(value);
	if ((role !== 'teacher' && role !== 'family') || secret?.length !== SECRET_BYTES) {
		return { error: 'invalid' };
	}
	return url.origin === origin ? { role, secret } : { error: 'other-installation' };
}
