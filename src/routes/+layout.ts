import { defaultLocale } from '$lib/i18n';
import type { LayoutLoad } from './$types';

// Page options belong to the route groups: (marketing) pages are static HTML without JavaScript, and
// (app) pages are static shells that run in the browser.
export const load: LayoutLoad = ({ params }) => ({ locale: params.locale ?? defaultLocale });
