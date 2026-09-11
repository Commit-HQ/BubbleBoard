# Architecture

One SvelteKit application, deployed as one Cloudflare Worker with static assets. Keep client code in `src/lib`, server-only helpers in `src/lib/server` when needed, and HTTP endpoints in `src/routes`. Use strict TypeScript and Svelte 5 runes. Avoid module-level mutable state on the server.

## Boundaries

- Browser: future QR enrollment, key derivation, encryption, photo processing, and decryption.
- Worker: future session authentication, authorization, ciphertext routing, and generic push delivery.
- D1: future opaque identifiers, sessions, and encrypted records.
- Private R2: future encrypted media, fetched through authorized Worker routes.

The bootstrap implements no authentication, encryption, uploads, or persistence. Do not accept real classroom information yet. Do not add placeholder cryptography or public upload endpoints.

## Pages and languages

Public pages are prerendered to static HTML with no client-side JavaScript (`src/routes/+layout.ts`). Croatian is served at `/` and English at `/en`; the optional `[[locale=locale]]` route segment and `src/params/locale.ts` keep the default language unprefixed. The language switch is a plain link, so no cookie is needed. `src/hooks.server.ts` sets the document language.

All interface copy lives in `src/lib/i18n/en.ts` and `hr.ts`. Croatian must satisfy the same TypeScript shape as English; add each new key to both dictionaries. Keep sentences whole rather than assembling translated fragments. Use native `Intl` formatters with the active locale when dates, numbers, or pluralized content are introduced. User-authored classroom content is not automatically translated.

## Dependency policy

Use platform APIs and Svelte first. Add a library only for an implemented need, after checking maintenance, licensing, bundle cost, and transitive dependencies. Tailwind CSS is the styling standard. No component UI library, ORM, global state package, date library, analytics, remote fonts, or image editor is needed for this foundation. Load future QR and photo tooling only in the routes that use it.

## Design

The look is cheerful glassmorphism: frosted white surfaces over soft coral, violet, sky, and sun gradients, with ink pill actions. Style with Tailwind CSS utilities in markup. `src/lib/styles/app.css` holds the theme tokens (`ink`, `muted`, `canvas`, `accent`, `blush`, `apricot`, `font-sans`, `font-display`), the `glass`, `bg-sunrise`, and `text-sunrise` utilities, and base styles. Prefer theme tokens and Tailwind's default scale over arbitrary values, and avoid component `<style>` blocks unless Tailwind cannot express the rule.

Fonts are final: Hedvig Letters Serif for headings and Hanken Grotesk for text, self-hosted from Fontsource files (OFL) and never loaded from a font CDN. `app.css` declares only the Latin and Latin Extended subsets, with metric-matched local fallbacks (Arial and Georgia, values from Capsize) so text doesn't shift when the fonts swap in. `src/hooks.server.ts` preloads the Latin files on every page and the Latin Extended files on Croatian pages.

Photos are real stock images committed pre-optimized as AVIF/WebP and rendered with `src/lib/components/Photo.svelte`; sources and licenses are in `src/lib/assets/photos/CREDITS.md`. Icons come from `src/lib/components/Icon.svelte`. Use semantic HTML, visible focus, comfortable touch targets, responsive layouts, and reduced-motion support. Extract components when they represent a reusable concept, not simply to split a file. Keep parent flows short and use defaults instead of repeated configuration choices.

## Security direction

The target is protection of stored content without server-held decryption keys. An operator who can modify delivered JavaScript remains trusted. Client compromise, shared QR cards, and saved photos remain outside that protection. Revocation blocks server access; it cannot erase retained keys or downloaded content.

A hash-mode CSP (`csp` in `vite.config.ts`) allows same-origin resources only, no inline scripts or styles beyond SvelteKit's hashed ones, no plugins, and no framing. Prerendered pages carry it as a `<meta>` tag and get the other security headers, including `frame-ancestors`, from `_headers`; Worker-rendered responses get them from `src/hooks.server.ts`. Keep the two header lists in sync and keep them strict: self-host new assets rather than widening directives. Enabling client-side rendering on a route needs a plan for SvelteKit's route announcer, which uses an inline style attribute; do not solve it with `'unsafe-inline'`.

The footer shows the commit a build came from (product specification §47). Publishing a build manifest and verifying deployed output belong with automated deploys. Before real data: implement and review authenticated routes, QR/session lifecycle, client encryption and format versioning, CSP for new features, retention/deletion, and notification enrollment. Never log QR secrets, tokens, plaintext content, or request bodies. Keep push text generic. No third-party runtime scripts or user-controlled HTML.

The detailed `product-spec.md` is the original target, not a statement of implemented guarantees. Reconcile it with the agreed simplified flows before implementing those features.

## Dependency audit at bootstrap

On 2026-09-11, `npm audit` reported one low-severity advisory in SvelteKit’s transitive `cookie` dependency ([GHSA-pxg6-pf52-xh8x](https://github.com/advisories/GHSA-pxg6-pf52-xh8x)), propagated to three package entries. The suggested automatic fix downgrades SvelteKit incompatibly, so it was not applied. This bootstrap sets no application cookies. Recheck upstream before implementing sessions; never derive cookie names, paths, or domains from untrusted input.
