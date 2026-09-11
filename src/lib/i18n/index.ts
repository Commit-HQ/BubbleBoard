import { en } from './en';
import { hr } from './hr';

export const messages = { hr, en };
export type Locale = keyof typeof messages;
export const locales = Object.keys(messages) as Locale[];
export const defaultLocale: Locale = 'hr';

export function isLocale(value: unknown): value is Locale {
	return typeof value === 'string' && Object.hasOwn(messages, value);
}

/** The default locale is served at `/`, every other locale under its own prefix. */
export function localePath(locale: Locale) {
	return locale === defaultLocale ? '/' : `/${locale}`;
}
