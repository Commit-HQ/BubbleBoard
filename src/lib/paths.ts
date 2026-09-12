import { defaultLocale, isLocale, type Locale } from '$lib/i18n';

// Every path the site links to. The default language, Croatian, has no prefix (`/`, `/app`); other
// languages do (`/en`, `/en/app`). Printed cards link to the app pages, so those paths must always work.

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
