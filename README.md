# BubbleBoard 🫧

**A little closer to their day.**

A small, open-source communication app for kindergarten communities. Inspired by a group called **Bubbles**, BubbleBoard aims to give families classroom updates, private conversations, and thoughtfully shared photos—without another daily place to check.

Teachers share a moment. Parents get a notification. The hosting server stores encrypted content without the keys needed to read it.

> **Status: early development.** This repository contains a prerendered Croatian and English landing page, the shell of the app, and the tested format for keys, QR cards, and encrypted records ([access format](docs/access-format.md)). Setup, QR access, storage, notifications, messages, and photos are not implemented yet. Do not use it with real family data yet. The landing page deliberately describes the finished product; this README tracks what exists.

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
npm run gen
npm run dev
```

Open the local address printed by Vite. `npm run gen` creates ignored Cloudflare runtime types from `wrangler.jsonc`; rerun it after changing bindings or updating Wrangler.

`.env` sets `PUBLIC_SITE_URL`, the public origin used for canonical links and link previews: `https://` and a hostname, with no path, query, or credentials (`http://localhost` also works). Pages are prerendered, so the address is written into the HTML at build time; a Worker variable set at runtime can't change pages that were already generated. The build stops with a message naming `PUBLIC_SITE_URL` when it's missing or invalid. Local Worker secrets, once a feature needs them, belong in the ignored `.dev.vars`.

| Command            | Purpose                                        |
| ------------------ | ---------------------------------------------- |
| `npm run dev`      | Development server with hot reload             |
| `npm run gen`      | Generate Cloudflare binding/runtime types      |
| `npm run check`    | Svelte and TypeScript checks                   |
| `npm run lint`     | Check formatting with Prettier                 |
| `npm run format`   | Apply formatting                               |
| `npm test`         | Behavior tests with Vitest                     |
| `npm run build`    | Build for Cloudflare Workers                   |
| `npm run preview`  | Run the built app in the local Workers runtime |
| `npm run validate` | Type checks, formatting, tests, and build      |
| `npm run deploy`   | Build and publish to your Cloudflare account   |

Measure performance (for example with Lighthouse) on a production build, `npm run build && npm run preview`; development performance is not representative. The app needs a secure context: use `localhost` or `https://`, not a plain `http://` network address, when opening it from another device.

`lint` checks formatting; Svelte diagnostics and TypeScript run through `check`. `npm test` covers what the code guarantees rather than component markup: key derivation, encryption, and card links now, and the database and session boundary as they land.

## Contributing

Run `npm run validate` before opening a pull request. The **Validate** GitHub Actions workflow runs the same checks, plus a Wrangler dry run, on every pull request and every push to `main`. It is validation only: it uses a placeholder `PUBLIC_SITE_URL`, needs no Cloudflare credentials, and never deploys, so don't publish its build. GitHub doesn't run workflows in a fork until Actions are enabled there, and a fork's runs deploy nothing either.

Add interface copy to both `src/lib/i18n/en.ts` and `hr.ts`. When bundling a new third-party asset, add its license to `static/third-party-notices.txt`. Conventions are in the [architecture notes](docs/architecture.md), the encryption format in the [access format](docs/access-format.md), and requirements in the [product specification](docs/product-spec.md).

## Deploy your own preview

1. Clone this repository and follow the local setup above.
2. Run `npx wrangler login` to authenticate to your Cloudflare account.
3. Choose a unique Worker `name` in `wrangler.jsonc`.
4. Set `PUBLIC_SITE_URL` in `.env` to the origin the site will be served from, such as `https://bubbleboard.example.com`. It is read when you build.
5. Run `npm run validate` and `npx wrangler deploy --dry-run`.
6. Run `npm run deploy`. Wrangler prints the deployed URL.
7. To use your own domain, add it to the Worker in the Cloudflare dashboard (**Workers & Pages → your Worker → Settings → Domains & Routes**). Domains are kept out of `wrangler.jsonc` so the configuration works for every installation.

This deploys the public foundation preview, **not a working kindergarten service**. The landing page is the same on every installation: it names no kindergarten, and its contact details belong to the BubbleBoard project (`src/lib/project.ts`). No credentials belong in Git. Production secrets should use `wrangler secret put` when the feature needing them exists.

### Storage when the first data feature lands

D1 and R2 are intentionally not provisioned yet. No unused cloud resources or speculative database schema are required to run the project.

```sh
npx wrangler d1 create bubbleboard
npx wrangler r2 bucket create bubbleboard-media
```

At that point add the returned database ID and your bucket name to `wrangler.jsonc`:

```json
{
	"d1_databases": [
		{
			"binding": "DB",
			"database_name": "bubbleboard",
			"database_id": "YOUR_DATABASE_ID",
			"migrations_dir": "migrations"
		}
	],
	"r2_buckets": [
		{
			"binding": "MEDIA",
			"bucket_name": "bubbleboard-media"
		}
	]
}
```

Merge these fields into the existing configuration, then regenerate types. Keep R2 private; never enable a public bucket URL for protected media. Introduce versioned D1 migrations alongside the first persistent feature, and document backup/restore before real use. Cloudflare’s free allowances may suit a small classroom, but usage limits and pricing still apply.

## Small by design

| Layer                 | Choice                                          |
| --------------------- | ----------------------------------------------- |
| Application           | Svelte 5 + SvelteKit + strict TypeScript        |
| Build                 | Vite                                            |
| Hosting               | Cloudflare Workers + official SvelteKit adapter |
| Styles                | Tailwind CSS v4, self-hosted fonts              |
| Formatting            | Prettier + Svelte and Tailwind plugins          |
| Tests                 | Vitest                                          |
| Encryption            | Browser Web Crypto API                          |
| Planned storage       | D1 for records; private R2 for encrypted media  |
| Planned notifications | Web Push                                        |

No component UI library, ORM, remote font service, analytics SDK, or separate backend. npm’s lockfile is committed for reproducible installs. The official tooling still has transitive dependencies; review additions and updates rather than assuming a small manifest means zero supply-chain risk.

```text
src/
  lib/
    assets/             Local brand assets and optimized photos
    components/         Reusable Svelte components
    i18n/               Croatian and English interface copy
    styles/             Tailwind entry, fonts, theme tokens, base styles
    base64url.ts        Encoding for card secrets, tokens, IDs, and envelopes
    crypto.ts           Browser keys, card derivation, and encrypted envelopes
    paths.ts            Site paths and QR card links
    project.ts          Project links and the validated site address
  params/               Route matchers (language prefix)
  routes/
    (marketing)/        Landing pages: static HTML without JavaScript
    (app)/              App pages: prerendered shells that run in the browser
  app.html              Document shell
  hooks.server.ts       Document language, font preloads, security headers
static/                 Public static files, including third-party notices
docs/                   Architecture notes, access format, product specification
_headers                Security headers for prerendered pages and assets
.env.example            Build-time settings to copy into .env
.github/workflows/      Validation pipeline (never deploys)
wrangler.jsonc          Worker and future binding configuration
```

Croatian is served at `/` and English at `/en`, both as static HTML without client-side JavaScript. The app is at `/app` and `/en/app`. Language, design, font, and security conventions are in the [architecture notes](docs/architecture.md).

## Privacy, precisely

The intended design encrypts sensitive content on users’ devices and does not give the server the keys needed to read stored content. It does **not** promise that every possible leak is harmless. A compromised device, shared QR card, saved photo, or malicious application update remains a risk. A host controls the JavaScript delivered to browsers; public source and deployment verification improve accountability, not mathematical isolation from that host.

Teachers manage family access and visibility choices. Removing access cannot recall saved copies or erase keys already held by a device. Kindergarten approval and consent remain part of operating the service.

See the [architecture notes](docs/architecture.md), the [access format](docs/access-format.md), and the [product specification](docs/product-spec.md). The specification describes the target system, and its opening note lists the decisions that have since replaced parts of it; it is not an implementation or a security audit.

## Next slices

1. Teacher setup, recovery QR, and family enrollment (in progress: the access format is in place).
2. An encrypted notice with push onboarding and a test notification on real iOS/Android devices.
3. Manual photo regions, consent lookup, private reveals, and exact audience previews.
4. Private messages and attachments.

Retention, authorization, deletion, and recovery belong in the features they protect. Photo tooling should load only when needed. Start with online content; offline libraries and queues can wait.

## License

BubbleBoard is licensed under the [GNU Affero General Public License v3.0](LICENSE). The third-party photos, fonts, and icons it bundles keep their own licenses. Their notices are in [`static/third-party-notices.txt`](static/third-party-notices.txt), which every installation also serves at `/third-party-notices.txt`.
