// Landing pages are prerendered to static HTML without client-side JavaScript. Links are all they need,
// and static HTML keeps the hash-based CSP deterministic (product-spec.md §37).
export const prerender = true;
export const csr = false;
