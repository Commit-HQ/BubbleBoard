import { defaultLocale, isLocale, type Locale } from '$lib/i18n';

// Every path the site links to. The default language, Croatian, has no prefix (`/`, `/app`); other
// languages do (`/en`, `/en/app`). Printed cards link to the app pages, so those paths must always work.

const prefix = (locale: Locale) => (locale === defaultLocale ? '' : `/${locale}`);

export function homePath(locale: Locale) {
	return prefix(locale) || '/';
}

/** App pages. Pages are prerendered once, so record IDs go in the query; they aren't secret. */
export type AppPage =
	'setup' | 'device' | 'classroom' | 'child' | 'child/new' | 'teachers' | 'teacher' | 'teacher/new';

export function appPath(locale: Locale, page?: AppPage, query?: Record<string, string>) {
	const path = `${prefix(locale)}/app${page ? `/${page}` : ''}`;
	return query ? `${path}?${new URLSearchParams(query)}` : path;
}

/** The current page in another language, without the query or fragment: a fragment can hold a card. */
export function localizedPath(pathname: string, locale: Locale) {
	const [, first = '', rest = ''] = /^\/([^/]*)(.*)$/.exec(pathname) ?? [];
	const path = first !== defaultLocale && isLocale(first) ? rest : pathname;
	return `${prefix(locale)}${path === '/' ? '' : path}` || '/';
}
