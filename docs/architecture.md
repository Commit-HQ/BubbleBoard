# Architecture

One SvelteKit application, deployed as one Cloudflare Worker with static assets. Keep client code in `src/lib`, server-only helpers in `src/lib/server` when needed, and HTTP endpoints in `src/routes`. Use strict TypeScript and Svelte 5 runes. Avoid module-level mutable state on the server.

## Boundaries

- Browser: future QR enrollment, key derivation, encryption, photo processing, and decryption.
- Worker: future session authentication, authorization, ciphertext routing, and generic push delivery.
- D1: future opaque identifiers, sessions, and encrypted records.
- Private R2: future encrypted media, fetched through authorized Worker routes.

The bootstrap implements no authentication, encryption, uploads, or persistence. Do not accept real classroom information yet. Do not add placeholder cryptography or public upload endpoints.

## Dependency policy

Use platform APIs and Svelte first. Add a library only for an implemented need, after checking maintenance, licensing, bundle cost, and transitive dependencies. No UI framework, ORM, global state package, date library, analytics, remote fonts, or image editor is needed for this foundation. Load future QR and photo tooling only in the routes that use it.

## Design

Shared color tokens live in `src/lib/styles/tokens.css`. Use semantic HTML, visible focus, comfortable touch targets, responsive layouts, and reduced-motion support. Extract components when they represent a reusable concept, not simply to split a file. Keep parent flows short and use defaults instead of repeated configuration choices.

## Security direction

The target is protection of stored content without server-held decryption keys. An operator who can modify delivered JavaScript remains trusted. Client compromise, shared QR cards, and saved photos remain outside that protection. Revocation blocks server access; it cannot erase retained keys or downloaded content.

Before real data: implement and review authenticated routes, QR/session lifecycle, client encryption and format versioning, production CSP, retention/deletion, and notification enrollment. Never log QR secrets, tokens, plaintext content, or request bodies. Keep push text generic. No third-party runtime scripts or user-controlled HTML.

The detailed `product-spec.md` is the original target, not a statement of implemented guarantees. Reconcile it with the agreed simplified flows before implementing those features.

## Dependency audit at bootstrap

On 2026-09-11, `npm audit` reported one low-severity advisory in SvelteKit’s transitive `cookie` dependency ([GHSA-pxg6-pf52-xh8x](https://github.com/advisories/GHSA-pxg6-pf52-xh8x)), propagated to three package entries. The suggested automatic fix downgrades SvelteKit incompatibly, so it was not applied. This bootstrap sets no application cookies. Recheck upstream before implementing sessions; never derive cookie names, paths, or domains from untrusted input.
