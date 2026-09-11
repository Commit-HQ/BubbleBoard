import { defaultLocale, isLocale, type Locale } from '$lib/i18n';

// `/` already serves the default locale, so only the other locales get a path prefix.
export function match(param: string): param is Locale {
	return param !== defaultLocale && isLocale(param);
}
