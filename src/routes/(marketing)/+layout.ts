// Landing pages are prerendered to static HTML without client-side JavaScript. Links are all they need,
// and static HTML keeps the hash-based CSP deterministic (product-spec.md §37). The walk through the app turns
// `csr` back on for itself, to slide between its steps.
export const prerender = true;
export const csr = false;
