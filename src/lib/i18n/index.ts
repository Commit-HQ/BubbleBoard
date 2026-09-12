import { en } from './en';
import { hr } from './hr';

export const messages = { hr, en };
export type Locale = keyof typeof messages;
export const locales = Object.keys(messages) as Locale[];
export const defaultLocale: Locale = 'hr';

export function isLocale(value: unknown): value is Locale {
	return typeof value === 'string' && Object.hasOwn(messages, value);
}
