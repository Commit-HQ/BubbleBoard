import { defaultLocale } from '$lib/i18n';
import type { LayoutLoad } from './$types';

// Pages are prerendered to static HTML without client-side JavaScript. Links are all they need, and
// static HTML keeps the hash-based CSP deterministic (product-spec.md §37). These options sit on the
// root layout only while the landing page is the only page: when the first interactive app route
// arrives, scope them to the landing pages instead (docs/architecture.md).
export const prerender = true;
export const csr = false;

export const load: LayoutLoad = ({ params }) => ({ locale: params.locale ?? defaultLocale });
