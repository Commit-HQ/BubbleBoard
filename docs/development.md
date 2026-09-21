# Development

Everything a contributor needs beyond the [README](../README.md): local setup in detail, the commands, the stack, and where things live.

## Start locally

Use **Node.js 24 LTS** and npm. No Cloudflare account is needed for local development.

```sh
npm ci
cp .env.example .env
npm run setup-link:local
npm run dev
```

`npm run setup-link:local` writes a setup token to the ignored `.dev.vars`, generates the ignored Cloudflare runtime types, and prints a setup link for `http://localhost:5173`. Open it once `npm run dev` is running (if Vite prints another port, use that port with the same `/app/setup#token=…`). Setup asks for your name and makes two cards to print: yours and a recovery card. `npm run dev` applies the database migrations to a local copy in `.wrangler/` before starting, and the first time adds a local key for signing notifications to `.dev.vars`. To start over locally, stop the server, delete `.wrangler/state`, and run `npm run setup-link:local` again.

`.env` sets `PUBLIC_SITE_URL`, the public origin used for canonical links and link previews: `https://` and a hostname, with no path, query, or credentials (`http://localhost` also works). Pages are prerendered, so the address is written into the HTML at build time; a Worker variable set at runtime can't change pages that were already generated. The build stops with a message naming `PUBLIC_SITE_URL` when it's missing or invalid. It also holds the storage limits (see [Storage](hosting.md#storage)). Local Worker secrets, such as the setup token, belong in the ignored `.dev.vars`.

| Command                    | Purpose                                                                           |
| -------------------------- | --------------------------------------------------------------------------------- |
| `npm run dev`              | Prepare the local database and notifications key, then run the development server |
| `npm run setup-link:local` | Write a local setup token and print its setup link                                |
| `npm run gen`              | Generate Cloudflare binding/runtime types                                         |
| `npm run check`            | Svelte and TypeScript checks                                                      |
| `npm run lint`             | Check formatting with Prettier                                                    |
| `npm run format`           | Apply formatting                                                                  |
| `npm test`                 | Behavior tests with Vitest                                                        |
| `npm run build`            | Build for Cloudflare Workers                                                      |
| `npm run preview`          | Prepare the same, then run the build in the local Workers runtime                 |
| `npm run validate`         | Type checks, formatting, tests, and build                                         |
| `npm run deploy`           | Build, publish, migrate the database, and print the first setup link              |
| `npm run setup-link`       | Replace the deployed setup token and print a new setup link                       |

Measure performance (for example with Lighthouse) on a production build, `npm run build && npm run preview`; development performance is not representative. The app needs a secure context: use `localhost` or `https://`, not a plain `http://` network address, when opening it from another device.

`lint` checks formatting; Svelte diagnostics and TypeScript run through `check`, which also fails when the generated types are out of date (`npm run gen`). `npm test` covers what the code guarantees rather than component markup: key derivation, encryption, card links, the records browsers build, and the database boundary, with who can read and change what, run on the real migrations in Node's SQLite.

## Small by design

| Layer         | Choice                                                                       |
| ------------- | ---------------------------------------------------------------------------- |
| Application   | Svelte 5 + SvelteKit + strict TypeScript                                     |
| Build         | Vite                                                                         |
| Hosting       | Cloudflare Workers + official SvelteKit adapter                              |
| Styles        | Tailwind CSS v4, self-hosted fonts                                           |
| Formatting    | Prettier + Svelte and Tailwind plugins                                       |
| Tests         | Vitest                                                                       |
| Encryption    | Browser Web Crypto API                                                       |
| Storage       | D1 for records; private R2 for encrypted photos and files, within set limits |
| QR codes      | `qr`, drawn for printed cards and read with the camera or from photos        |
| HEIC photos   | `libheif-js`, loaded only for HEIC photos the browser can’t open itself      |
| Notice editor | Tiptap, loaded only on the page where notices are written                    |
| Notifications | Web Push without content, sent through a Cloudflare Queue                    |

No component UI library, ORM, remote font service, analytics SDK, or separate backend. npm’s lockfile is committed for reproducible installs. The official tooling still has transitive dependencies; review additions and updates rather than assuming a small manifest means zero supply-chain risk.

```text
src/
  lib/
    app/                App screens: components, browser state, QR drawing and scanning
    assets/             Local brand assets, optimized photos, and screens of the app for its walk-through
    components/         Reusable Svelte components
    i18n/               Croatian and English interface copy
    server/             Worker only: sessions, request checks, database queries, storage limits
    styles/             Tailwind entry, fonts, theme tokens, base styles
    api.ts              Requests between the app and the Worker
    base64url.ts        Encoding for tokens, IDs, and envelopes
    card.ts             Card codes and QR card links
    crypto.ts           Browser keys, card derivation, and encrypted envelopes
    device.ts           The connected card's keys in IndexedDB
    files.ts            Files on notices: kinds, sizes, and encryption
    kindergarten.ts     Records the browser decrypts and builds
    paths.ts            Site paths
    project.ts          Project links and the validated site address
  params/               Route matchers (language prefix, record IDs, walk-through roles)
  routes/
    (marketing)/        Landing, walk-through, and privacy pages: static HTML without JavaScript
    (app)/              App pages: prerendered shells that run in the browser
    api/                JSON endpoints for the app
  app.d.ts              Worker bindings for TypeScript
  app.html              Document shell
  hooks.server.ts       Document language, font preloads, security headers, cross-site check
migrations/             D1 schema
scripts/                Deploying, setup links, the notifications key, and starting over
static/                 Public static files: app icons and third-party notices
worker/                 The Worker's entry: SvelteKit, sending notifications, daily cleanup
docs/                   Hosting, development, status, decisions, architecture, formats, specification
_headers                Security headers for prerendered pages and assets
.env.example            Build-time settings to copy into .env
.github/workflows/      Validation pipeline (never deploys)
wrangler.jsonc          Worker, database, bucket, queue, schedule, and rate limit configuration
wrangler.build.jsonc    Where SvelteKit's adapter writes the build the Worker's entry imports
```

Croatian is served at `/` and English at `/en`, both as static HTML without client-side JavaScript. The app is at `/app` and `/en/app`. Language, design, font, and security conventions are in the [architecture notes](architecture.md).
