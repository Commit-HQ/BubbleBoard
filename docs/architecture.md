# Architecture

One SvelteKit application, deployed as one Cloudflare Worker with static assets. Keep client code in `src/lib`, server-only helpers in `src/lib/server` when needed, and HTTP endpoints in `src/routes`. Use strict TypeScript and Svelte 5 runes. Module-level constants such as lookup tables and asset lists are fine; never keep per-user or per-request mutable state at module level on the server.

## Boundaries

- Browser: card reading, key derivation, encryption and decryption, and later photo processing, in the [access format](access-format.md).
- Worker: future session authentication, authorization, ciphertext routing, and generic push delivery.
- D1: future opaque identifiers, sessions, and encrypted records.
- Private R2: future encrypted media, fetched through authorized Worker routes.

So far there is the app shell and the tested access format (`src/lib/crypto.ts`, `src/lib/paths.ts`), but no authentication, persistence, or uploads. Do not accept real classroom information yet, and do not add public upload endpoints. Records are encrypted from the first one persisted; there is no plaintext version to migrate later.

## Pages and languages

Pages live in two route groups. `(marketing)` holds the landing pages, prerendered to static HTML without client-side JavaScript (`prerender` and `csr` in its `+layout.ts`). `(app)` holds the app: pages prerendered as static shells that then run in the browser. Their HTML carries no classroom data, and the server never renders any; protected data arrives as ciphertext and is decrypted on the device. The root layout only adds the stylesheet, favicon, and locale.

Croatian is served at `/` and `/app`, English at `/en` and `/en/app`; the optional `[[locale=locale]]` route segment and `src/params/locale.ts` keep the default language unprefixed. `src/lib/paths.ts` builds every path, including the language switch's link to the same page in the other language, and the QR card links. Card links are read by their origin and fragment only, so printed cards keep working in either language; `/app` and `/en/app` must always open the app. The language switch is a plain link, so no cookie is needed. `src/hooks.server.ts` sets the document language.

The landing page is identical on every installation: it names no kindergarten, and its contact details belong to the project (`src/lib/project.ts`). It describes the finished product in the present tense, while README tracks what is implemented. Until families can connect with a card, the page says the app is coming in plain text and its call to action leads to the contact section; link to the app once they can.

Canonical URLs, `hreflang` alternates, and link-preview tags need an absolute address, which prerendered pages can't take from a request. It comes from the required build-time `PUBLIC_SITE_URL` in `.env`, read with `$env/static/public`; Worker `vars` don't exist at build time and can't change generated HTML. `src/lib/project.ts` accepts only an `https://` origin (or `http://` for localhost) without credentials, path, query, or fragment, and otherwise stops the build with a message. Build absolute links with its `absoluteUrl`.

All interface copy lives in `src/lib/i18n/en.ts` and `hr.ts`. Croatian must satisfy the same TypeScript shape as English; add each new key to both dictionaries. Keep sentences whole rather than assembling translated fragments, and keep links out of translated strings: put the linked words in markup, as the footer does for Commit. Use native `Intl` formatters with the active locale when dates, numbers, or pluralized content are introduced. User-authored classroom content is not automatically translated.

## Dependency policy

Use platform APIs and Svelte first. Add a library only for an implemented need, after checking maintenance, licensing, bundle cost, and transitive dependencies. Tailwind CSS is the styling standard. No component UI library, ORM, global state package, date library, analytics, remote fonts, or image editor is needed for this foundation. Load future QR and photo tooling only in the routes that use it.

Vitest is the one test runner, a development dependency only. It reuses the Vite and SvelteKit configuration, so tests import `$lib` modules as the app does, and it runs the same Web Crypto API in Node. Test behavior the code guarantees, such as encryption, card links, and authorization, not component markup.

## Design

The look is cheerful glassmorphism: translucent white surfaces over soft coral, violet, sky, and sun gradients, with ink pill actions. Style with Tailwind CSS utilities in markup; Prettier sorts the classes. `src/lib/styles/app.css`, the only stylesheet, holds the theme tokens (`ink`, `muted`, `canvas`, `accent`, `blush`, `apricot`, `font-sans`, `font-display`), the utilities below, and base styles. Prefer theme tokens and Tailwind's default scale over arbitrary values, and avoid component `<style>` blocks unless Tailwind cannot express the rule.

- `glass` is the surface for cards and sections. It has no backdrop blur, which over the soft page backdrop would look nearly the same and cost painting while scrolling. It creates no stacking context, so add `isolate` when a child uses a negative z-index.
- `frosted` adds the blur, with a nearly opaque fallback where `backdrop-filter` is unsupported. Use it only where content moves or sits behind the surface: the sticky header and overlays on photos.
- `bg-sunrise` is the decorative brand gradient for icon tiles. `text-sunrise` is its version for heading text, with darker stops, and falls back to plain text in forced-colours mode.

Palette colours are not automatically text colours: blush and apricot are too light for text on this page. Check text contrast (4.5:1, or 3:1 for large headings) against the tinted backdrop, not only the canvas. Don't let colour alone mark a state; forced colours remove fills.

Fonts are final: Hedvig Letters Serif for headings and Hanken Grotesk for text, self-hosted from Fontsource files (OFL) and never loaded from a font CDN. `app.css` declares only the Latin and Latin Extended subsets, with metric-matched local fallbacks (Arial and Georgia, values from Capsize) so text doesn't shift when the fonts swap in. `src/hooks.server.ts` preloads the Latin files on every page and the Latin Extended files on Croatian pages; app pages, which open with body text, skip the display font.

Photos are real stock images committed pre-optimized as AVIF/WebP, with sources and processing notes in `src/lib/assets/photos/CREDITS.md`. `src/lib/components/Photo.svelte` lists them by name, so a wrong name fails type checking and a missing file fails the build. Give each placement a `sizes` value that matches its layout, and set `eager` only on the photo in the first view. Only the landing page uses photos. Icons come from `src/lib/components/Icon.svelte`. Photo, font, and icon licenses are in `static/third-party-notices.txt`, which every installation serves; update it when bundling a new asset. No remote images, remote fonts, or animation library.

Use semantic HTML, visible focus, comfortable touch targets, responsive layouts, and reduced-motion support. Only real links should look and behave like links. Extract components when they represent a reusable concept, not simply to split a file. Keep parent flows short and use defaults instead of repeated configuration choices. App pages show a real loading state while they start, and errors say what to do next in both languages.

## Security direction

The target is protection of stored content without server-held decryption keys. An operator who can modify delivered JavaScript remains trusted. Client compromise, shared QR cards, and saved photos remain outside that protection. Revocation blocks server access; it cannot erase retained keys or downloaded content.

A hash-mode CSP (`csp` in `vite.config.ts`) allows same-origin resources only, no inline scripts or styles beyond SvelteKit's hashed ones, no plugins, and no framing. Prerendered pages carry it as a `<meta>` tag and get the other security headers, including `frame-ancestors`, from `_headers`; Worker-rendered responses get them from `src/hooks.server.ts`. Keep the two header lists in sync and keep them strict: self-host new assets rather than widening directives. App pages run SvelteKit in the browser, whose route announcer has one fixed inline style attribute: `style-src-attr` allows exactly that value by hash (`'unsafe-hashes'`, never `'unsafe-inline'`), and `src/csp.test.ts` fails when a SvelteKit update changes it. Style with classes, not inline style attributes.

Card secrets stay in URL fragments: never put them in paths, queries, request bodies, storage, or logs. Keys are created and used with Web Crypto as non-extractable `CryptoKey` objects; that prevents accidental export, not misuse by a script running in the app, so XSS remains critical (product-spec.md §36).

The footer shows the commit a build came from (product specification §47), marked as modified when the build had uncommitted changes, including new files Git doesn't ignore, and an unknown build when there was no Git metadata (for example, a source ZIP). A commit is provenance, not proof that a deployed tree matches it. Publishing a build manifest and verifying deployed output belong with automated deploys. Before real data: implement and review authenticated routes, the QR/session lifecycle, CSP for new features, retention/deletion, and notification enrollment, and review the access format. Never log QR secrets, tokens, plaintext content, or request bodies. Keep push text generic. No third-party runtime scripts or user-controlled HTML.

The [product specification](product-spec.md) holds the requirements. It is the original target, not a statement of implemented guarantees, and its opening note lists the decisions that have since replaced parts of it. Follow that note where they differ, and reconcile the rest with it before implementing a feature.

## Dependency audit at bootstrap

On 2026-09-11, `npm audit` reported one low-severity advisory in SvelteKit’s transitive `cookie` dependency ([GHSA-pxg6-pf52-xh8x](https://github.com/advisories/GHSA-pxg6-pf52-xh8x)), propagated to three package entries. The suggested automatic fix downgrades SvelteKit incompatibly, so it was not applied. This bootstrap sets no application cookies. Recheck upstream before implementing sessions; never derive cookie names, paths, or domains from untrusted input.
