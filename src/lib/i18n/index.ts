import { en } from './en';
import { hr } from './hr';

export const messages = { hr, en };
export type Locale = keyof typeof messages;
export const locales = Object.keys(messages) as Locale[];
export const defaultLocale: Locale = 'hr';

export function isLocale(value: unknown): value is Locale {
	return typeof value === 'string' && Object.hasOwn(messages, value);
}

/** Names on a detail line, such as “Ivana (mum), Marko (dad)”. */
export function listNames(locale: Locale, names: string[]) {
	return new Intl.ListFormat(locale, { type: 'unit', style: 'short' }).format(names);
}

/** A teacher's name as the app shows it. The recovery card has no name, so it gets its label. */
export function teacherName(locale: Locale, teacher: { name: string; recovery: boolean }) {
	return teacher.recovery ? messages[locale].app.card.kinds.recovery : teacher.name;
}

/** Explains an error code from the server, a card, or the app itself. */
export function errorMessage(locale: Locale, code: string) {
	const errors: Record<string, string> = messages[locale].app.errors;
	return errors[code] ?? errors.unexpected;
}
