import { error, redirect } from '@sveltejs/kit';
import { isLocale, localeCookie } from '$lib/i18n';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, cookies, url }) => {
	if (request.headers.get('origin') !== url.origin) error(403, 'Invalid origin');
	const locale = (await request.formData()).get('locale');
	if (!isLocale(locale)) error(400, 'Unsupported language');
	cookies.set(localeCookie, locale, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: url.protocol === 'https:',
		maxAge: 60 * 60 * 24 * 365
	});
	redirect(303, '/');
};
