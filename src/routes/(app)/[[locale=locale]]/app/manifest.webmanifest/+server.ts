import { json } from '@sveltejs/kit';
import { defaultLocale, isLocale, messages } from '$lib/i18n';
import { appPath } from '$lib/paths';
import type { RequestHandler } from './$types';

// The web app manifest, in each language. Both start the same app, with one ID and scope, so installing
// from either language gives one BubbleBoard. The icons in static/icons are the favicon's design, full bleed.
export const prerender = true;

export const GET: RequestHandler = ({ params }) => {
	const locale = isLocale(params.locale) ? params.locale : defaultLocale;
	const icon = (size: number, purpose: 'any' | 'maskable') => ({
		src: `/icons/icon-${size}.png`,
		sizes: `${size}x${size}`,
		type: 'image/png',
		purpose
	});
	return json(
		{
			id: '/app',
			name: 'BubbleBoard',
			short_name: 'BubbleBoard',
			description: messages[locale].description,
			lang: locale,
			dir: 'ltr',
			start_url: appPath(locale),
			scope: '/',
			display: 'standalone',
			background_color: '#faf7ff',
			theme_color: '#faf7ff',
			icons: [icon(192, 'any'), icon(512, 'any'), icon(192, 'maskable'), icon(512, 'maskable')]
		},
		{ headers: { 'content-type': 'application/manifest+json' } }
	);
};
