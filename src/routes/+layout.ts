import { pathLocale } from '$lib/paths';
import type { LayoutLoad } from './$types';

// Page options belong to the route groups: (marketing) pages are static HTML without JavaScript, and
// (app) pages are static shells that run in the browser. The language comes from the path, which the
// error page for an address no page has also needs.
export const load: LayoutLoad = ({ url }) => ({ locale: pathLocale(url.pathname) });
