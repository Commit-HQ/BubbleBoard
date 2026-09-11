import type { Handle } from '@sveltejs/kit';
import { defaultLocale, isLocale, localeCookie } from '$lib/i18n';

export const handle: Handle = async ({ event, resolve }) => {
	const saved = event.cookies.get(localeCookie);
	event.locals.locale = isLocale(saved) ? saved : defaultLocale;
	const response = await resolve(event, {
		transformPageChunk: ({ html }) => html.replace('%lang%', event.locals.locale)
	});
	response.headers.set('Content-Language', event.locals.locale);
	response.headers.set('Cache-Control', 'private, no-store');
	return response;
};
