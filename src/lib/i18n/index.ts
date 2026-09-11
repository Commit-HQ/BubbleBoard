import { en } from './en';
import { hr } from './hr';
export type Locale = 'hr' | 'en';
export const defaultLocale: Locale = 'hr';
export const localeCookie = 'bubbleboard-language';
export const messages = { hr, en };
export function isLocale(value: unknown): value is Locale {
	return value === 'hr' || value === 'en';
}
