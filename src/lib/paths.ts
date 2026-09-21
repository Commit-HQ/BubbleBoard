import { defaultLocale, isLocale, type Locale } from '$lib/i18n';

// Every path the site links to. The default language, Croatian, has no prefix (`/`, `/app`); other
// languages do (`/en`, `/en/app`). Printed cards link to the app pages, so those paths must always work.

const prefix = (locale: Locale) => (locale === defaultLocale ? '' : `/${locale}`);

export function homePath(locale: Locale) {
	return prefix(locale) || '/';
}

export function privacyPath(locale: Locale) {
	return `${prefix(locale)}/privacy`;
}

/** Whose walk through the app a landing page shows (`/explore/parents`, `/en/explore/teachers`). */
export const exploreRoles = ['parents', 'teachers'] as const;
export type ExploreRole = (typeof exploreRoles)[number];

export function explorePath(locale: Locale, role: ExploreRole) {
	return `${prefix(locale)}/explore/${role}`;
}

/** App pages. Pages are prerendered once, so record IDs go in the query; they aren't secret. */
export type AppPage =
	| 'event'
	| 'event/new'
	| 'meetings'
	| 'messages'
	| 'setup'
	| 'options'
	| 'manage'
	| 'classroom'
	| 'child'
	| 'child/new'
	| 'teachers'
	| 'teacher'
	| 'teacher/new'
	| 'notice'
	| 'notice/new'
	| 'photo'
	| 'info'
	| 'info/new'
	| 'info/edit';

export function appPath(locale: Locale, page?: AppPage, query?: Record<string, string>) {
	const path = `${prefix(locale)}/app${page ? `/${page}` : ''}`;
	return query ? `${path}?${new URLSearchParams(query)}` : path;
}

/** The language of a path, from its prefix. Any other path, even one no page has, is in the default language. */
export function pathLocale(pathname: string): Locale {
	const [, first] = pathname.split('/');
	return first !== defaultLocale && isLocale(first) ? first : defaultLocale;
}

/** The current page in another language, without the query or fragment: a fragment can hold a card. */
export function localizedPath(pathname: string, locale: Locale) {
	const [, first = '', rest = ''] = /^\/([^/]*)(.*)$/.exec(pathname) ?? [];
	const path = first !== defaultLocale && isLocale(first) ? rest : pathname;
	return `${prefix(locale)}${path === '/' ? '' : path}` || '/';
}
