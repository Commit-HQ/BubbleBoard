# BubbleBoard 🫧

**A little closer to their day.**

A small, open-source communication app for kindergarten communities. Inspired by a group called **Bubbles**, BubbleBoard aims to give families classroom updates, private conversations, and thoughtfully shared photos—without another daily place to check.

Teachers share a moment. Parents get a notification. The hosting server stores encrypted content without the keys needed to read it.

> **Status: early development.** This repository contains a prerendered Croatian and English landing page and the first part of the app: setting up a kindergarten, classrooms, teachers and admins, children with their family cards, printing cards, and connecting devices with a card's link, the camera, a photo of it, or its code. Everything is encrypted in the browser ([access format](docs/access-format.md)). Teachers post notices, written with a rich text editor and sometimes with a poll, to the board on everyone's home, and families mark them as seen and answer the polls for their teachers. Phones and tablets install the app before using it, and devices can turn on notifications for new notices, which carry no content; messages and photos are not implemented yet. Do not use it with real family data yet. The landing page deliberately describes the finished product; this README tracks what exists.

## What we’re building

- **QR cards instead of passwords:** one family card for all of a family’s devices, and a card for each teacher.
- **Updates that find you:** generic push notifications for new classroom content.
- **A single feed:** notices, photos, and attachments together.
- **A private family conversation:** a direct line to teachers.
- **A practical photo workflow:** teachers mark a region and select a child; the app prepares a covered classroom image and private reveals for that child’s family.
- **Your own installation:** each kindergarten deploys the same code to its own Cloudflare account.

Keep parents’ choices few, give teachers sensible defaults, and keep the implementation small enough to understand.

## Start locally

Use **Node.js 24 LTS** and npm. No Cloudflare account is needed for local development.

```sh
npm ci
cp .env.example .env
npm run setup-link:local
npm run dev
```

`npm run setup-link:local` writes a setup token to the ignored `.dev.vars`, generates the ignored Cloudflare runtime types, and prints a setup link for `http://localhost:5173`. Open it once `npm run dev` is running (if Vite prints another port, use that port with the same `/app/setup#token=…`). Setup asks for your name and makes two cards to print: yours and a recovery card. `npm run dev` applies the database migrations to a local copy in `.wrangler/` before starting, and the first time adds a local key for signing notifications to `.dev.vars`. To start over locally, stop the server, delete `.wrangler/state`, and run `npm run setup-link:local` again.

`.env` sets `PUBLIC_SITE_URL`, the public origin used for canonical links and link previews: `https://` and a hostname, with no path, query, or credentials (`http://localhost` also works). Pages are prerendered, so the address is written into the HTML at build time; a Worker variable set at runtime can't change pages that were already generated. The build stops with a message naming `PUBLIC_SITE_URL` when it's missing or invalid. Local Worker secrets, such as the setup token, belong in the ignored `.dev.vars`.

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

## Contributing

Run `npm run validate` before opening a pull request. The **Validate** GitHub Actions workflow runs the same checks, plus a Wrangler dry run, on every pull request and every push to `main`. It is validation only: it uses a placeholder `PUBLIC_SITE_URL`, needs no Cloudflare credentials, and never deploys, so don't publish its build. GitHub doesn't run workflows in a fork until Actions are enabled there, and a fork's runs deploy nothing either.

Add interface copy to both `src/lib/i18n/en.ts` and `hr.ts`. When bundling a new third-party asset or library, add its license to `static/third-party-notices.txt`. Conventions are in the [architecture notes](docs/architecture.md), the encryption format in the [access format](docs/access-format.md), and requirements in the [product specification](docs/product-spec.md).

## Deploy your own installation

1. Clone this repository and follow the local setup above.
2. Run `npx wrangler login` to authenticate to your Cloudflare account.
3. Choose a unique Worker `name` in `wrangler.jsonc`.
4. Set `PUBLIC_SITE_URL` in `.env` to the origin the site will be served from, such as `https://bubbleboard.example.com`. It is read when you build.
5. Run `npm run validate` and `npx wrangler deploy --dry-run`.
6. Run `npm run deploy`. The first deploy creates the database and the notifications queue, applies the migrations, stores a new `SETUP_TOKEN` secret and the `VAPID_KEY` secret that signs notifications, and prints a setup link. Later deploys apply new migrations and leave both secrets alone: a new `VAPID_KEY` would silently end every device's notifications. When a deploy creates a resource, Wrangler also writes it into `wrangler.jsonc`; the deploy puts the file back as it was, so it stays the same for every installation, since later deploys find the resources by name.
7. To use your own domain, add it to the Worker in the Cloudflare dashboard (**Workers & Pages → your Worker → Settings → Domains & Routes**) before opening the setup link, which points at `PUBLIC_SITE_URL`. The domain must first be active in the same Cloudflare account: for a domain registered elsewhere, add it under **Domains**, turn off DNSSEC at the registrar if it's on, and replace the registrar's nameservers with the two Cloudflare shows. Turn on **Always Use HTTPS** for the domain (**SSL/TLS → Edge Certificates**): the app needs `https://`, and the domain otherwise also answers plain `http://`. Domains are kept out of `wrangler.jsonc` so the configuration works for every installation. Printed cards use the address setup was opened on, so set up on the final domain.
8. Open the setup link on the first admin's device, enter their name, and print or save both cards before continuing. Keep the recovery card somewhere safe: it can do everything an admin can.

The setup token only allows the first setup. If the link is lost before then, `npm run setup-link` replaces the token and prints a new link.

If setup finished but its cards were neither printed nor saved, the device that ran setup is still connected as the admin. Open BubbleBoard there, go to **Manage** and then **Teachers**, and use **Replace card** on your own name and on the recovery card, then print or save the new cards. The old ones stop working.

Start over only when no device or card can open BubbleBoard, for example when the setup page closed before it showed the cards. This deletes every record:

```sh
npx wrangler d1 execute DB --remote --file scripts/start-over.sql
npm run setup-link
```

This is an early version: don't use it with real family data yet. The landing page is the same on every installation: it names no kindergarten, and its contact details belong to the BubbleBoard project (`src/lib/project.ts`). No credentials belong in Git.

### Storage

The Worker keeps its records in a D1 database bound as `DB`, with the schema in `migrations/`. `wrangler.jsonc` names the database without an ID, so the first deploy creates it in your account, and local development keeps its own copy in `.wrangler/`. Nothing in it is readable without a card: names live in encrypted profiles, and the server stores hashes of card and session tokens. Document backup and restore before real use. Private R2 storage for encrypted media comes with photos. Cloudflare’s free allowances may suit a small kindergarten, but usage limits and pricing still apply.

## Small by design

| Layer         | Choice                                                                |
| ------------- | --------------------------------------------------------------------- |
| Application   | Svelte 5 + SvelteKit + strict TypeScript                              |
| Build         | Vite                                                                  |
| Hosting       | Cloudflare Workers + official SvelteKit adapter                       |
| Styles        | Tailwind CSS v4, self-hosted fonts                                    |
| Formatting    | Prettier + Svelte and Tailwind plugins                                |
| Tests         | Vitest                                                                |
| Encryption    | Browser Web Crypto API                                                |
| Storage       | D1 for records; private R2 for encrypted media later                  |
| QR codes      | `qr`, drawn for printed cards and read with the camera or from photos |
| Notice editor | Tiptap, loaded only on the page where notices are written             |
| Notifications | Web Push without content, sent through a Cloudflare Queue             |

No component UI library, ORM, remote font service, analytics SDK, or separate backend. npm’s lockfile is committed for reproducible installs. The official tooling still has transitive dependencies; review additions and updates rather than assuming a small manifest means zero supply-chain risk.

```text
src/
  lib/
    app/                App screens: components, browser state, QR drawing and scanning
    assets/             Local brand assets and optimized photos
    components/         Reusable Svelte components
    i18n/               Croatian and English interface copy
    server/             Worker only: sessions, request checks, database queries
    styles/             Tailwind entry, fonts, theme tokens, base styles
    api.ts              Requests between the app and the Worker
    base64url.ts        Encoding for tokens, IDs, and envelopes
    card.ts             Card codes and QR card links
    crypto.ts           Browser keys, card derivation, and encrypted envelopes
    device.ts           The connected card's keys in IndexedDB
    kindergarten.ts     Records the browser decrypts and builds
    paths.ts            Site paths
    project.ts          Project links and the validated site address
  params/               Route matchers (language prefix, record IDs)
  routes/
    (marketing)/        Landing pages: static HTML without JavaScript
    (app)/              App pages: prerendered shells that run in the browser
    api/                JSON endpoints for the app
  app.d.ts              Worker bindings for TypeScript
  app.html              Document shell
  hooks.server.ts       Document language, font preloads, security headers, cross-site check
migrations/             D1 schema
scripts/                Deploying, setup links, the notifications key, and starting over
static/                 Public static files: app icons and third-party notices
worker/                 The Worker's entry: SvelteKit, sending notifications, daily cleanup
docs/                   Architecture notes, access format, product specification
_headers                Security headers for prerendered pages and assets
.env.example            Build-time settings to copy into .env
.github/workflows/      Validation pipeline (never deploys)
wrangler.jsonc          Worker, database, queue, schedule, and rate limit configuration
wrangler.build.jsonc    Where SvelteKit's adapter writes the build the Worker's entry imports
```

Croatian is served at `/` and English at `/en`, both as static HTML without client-side JavaScript. The app is at `/app` and `/en/app`. Language, design, font, and security conventions are in the [architecture notes](docs/architecture.md).

## Privacy, precisely

The intended design encrypts sensitive content on users’ devices and does not give the server the keys needed to read stored content. It does **not** promise that every possible leak is harmless. A compromised device, shared QR card, saved photo, or malicious application update remains a risk. A host controls the JavaScript delivered to browsers; public source and deployment verification improve accountability, not mathematical isolation from that host.

Admins manage classrooms, teachers, and family cards. Every staff card opens the same Staff Key, so the server, not encryption, keeps each teacher to their own classrooms; families are kept apart by encryption. Removing access cannot recall saved copies or erase keys already held by a device. Kindergarten approval and consent remain part of operating the service.

See the [architecture notes](docs/architecture.md), the [access format](docs/access-format.md), and the [product specification](docs/product-spec.md). The specification describes the target system, and its opening note lists the decisions that have since replaced parts of it; it is not an implementation or a security audit.

## Next slices

1. Kindergarten setup, classrooms, teachers, children with family cards, and connecting devices. Implemented and deployed; card links work on real iPhone and Android phones, and a few checks remain.
2. Encrypted notices for chosen classrooms, with a rich editor, notifications, and installing on phones and tablets, tried on real iOS and Android devices ([plan](docs/next-step-plan.md)).
3. Manual photo regions, consent lookup, private reveals, and exact audience previews.
4. Private messages and attachments.

Retention, authorization, deletion, and recovery belong in the features they protect. Photo tooling should load only when needed. Start with online content; offline libraries and queues can wait.

## License

BubbleBoard is licensed under the [GNU Affero General Public License v3.0](LICENSE). The third-party photos, fonts, icons, and libraries it bundles keep their own licenses. Their notices are in [`static/third-party-notices.txt`](static/third-party-notices.txt), which every installation also serves at `/third-party-notices.txt`.
