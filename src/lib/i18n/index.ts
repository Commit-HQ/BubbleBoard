import { en, notificationText as enNotification, type Messages } from './en';
import { hr, notificationText as hrNotification } from './hr';
import type { PushKind } from '../push';

// The languages and their messages. The languages are plain values, so code that only checks a language,
// such as the service worker's, doesn't bundle every message.

export const locales = ['hr', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'hr';
export const messages: Record<Locale, Messages> = { hr, en };
/** What notifications say, apart from `messages` so the service worker takes only these words. */
export const notificationTexts: Record<Locale, Record<PushKind, string>> = {
	hr: hrNotification,
	en: enNotification
};

export function isLocale(value: unknown): value is Locale {
	return locales.includes(value as Locale);
}

const nameLists: Partial<Record<Locale, Intl.ListFormat>> = {};

/** Names on a detail line, such as “Horvat family, Kovač family”. */
export function listNames(locale: Locale, names: string[]) {
	// A formatter is slow to make, so each language's is made once.
	nameLists[locale] ??= new Intl.ListFormat(locale, { type: 'unit', style: 'short' });
	return nameLists[locale].format(names);
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

/** When a notice or board photo went up, as each language writes it (`app.dateTime`). */
export function formatDateTime(locale: Locale, time: number) {
	const date = new Date(time);
	const [day, month, minutes] = [date.getDate(), date.getMonth() + 1, date.getMinutes()].map(
		(part) => String(part).padStart(2, '0')
	);
	const clock = `${date.getHours()}:${minutes}`;
	return messages[locale].app.dateTime(day, month, date.getFullYear(), clock);
}

/**
 * Who put something up and when, and the word saying it was changed since when it was, as the byline of a
 * notice's or an event's card.
 */
export function byline(locale: Locale, author: string | undefined, time: number, edited?: string) {
	return [author, formatDateTime(locale, time), edited].filter(Boolean).join(' · ');
}

/** A day on its own, such as an event's date, from its `YYYY-MM-DD` form (`app.date`). */
export function formatDay(locale: Locale, iso: string) {
	// Read as local time: `new Date('2026-09-20')` is UTC midnight, which is the day before in the west.
	const date = new Date(`${iso}T00:00`);
	if (Number.isNaN(date.getTime())) return iso;
	const [day, month] = [date.getDate(), date.getMonth() + 1].map((part) =>
		String(part).padStart(2, '0')
	);
	return messages[locale].app.date(day, month, date.getFullYear());
}

/** A file's size, such as “240 kB” or “3.4 MB”. */
export function fileSize(locale: Locale, bytes: number) {
	const megabytes = bytes >= 1e6;
	return new Intl.NumberFormat(locale, {
		style: 'unit',
		unit: megabytes ? 'megabyte' : 'kilobyte',
		maximumFractionDigits: megabytes ? 1 : 0
	}).format(megabytes ? bytes / 1e6 : Math.max(1, Math.round(bytes / 1e3)));
}
