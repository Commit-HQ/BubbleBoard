import { en, notificationText as enNotification, type Messages } from './en';
import { hr, notificationText as hrNotification } from './hr';

// The languages and their messages. The languages are plain values, so code that only checks a language,
// such as the service worker's, doesn't bundle every message.

export const locales = ['hr', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'hr';
export const messages: Record<Locale, Messages> = { hr, en };
/** What every notification says, apart from `messages` so the service worker takes only these words. */
export const notificationTexts: Record<Locale, string> = { hr: hrNotification, en: enNotification };

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

/** When a notice or board photo went up: “23.01.2026 u 8:30”, or “23/01/2026 at 8:30” in English. */
export function formatDateTime(locale: Locale, time: number) {
	const date = new Date(time);
	const [day, month, minutes] = [date.getDate(), date.getMonth() + 1, date.getMinutes()].map(
		(part) => String(part).padStart(2, '0')
	);
	const [separator, at] = locale === 'hr' ? ['.', 'u'] : ['/', 'at'];
	return `${[day, month, date.getFullYear()].join(separator)} ${at} ${date.getHours()}:${minutes}`;
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
