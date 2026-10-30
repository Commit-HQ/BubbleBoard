// Landing pages are prerendered to static HTML without client-side JavaScript. Links are all they need,
// and static HTML keeps the hash-based CSP deterministic (product-spec.md §37). The walk through the app turns
// `csr` back on for itself, to slide between its steps. The tour's play button takes a small script of its
// own, which src/lib/components/Tour.svelte links as a file rather than as the app's code.
export const prerender = true;
export const csr = false;
