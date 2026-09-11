# BubbleBoard 🫧

**A little closer to their day.**

A small, open-source communication app for kindergarten communities. Inspired by a group called **Bubbles**, BubbleBoard aims to give families classroom updates, private conversations, and thoughtfully shared photos—without another daily place to check.

Teachers share a moment. Parents get a notification. The hosting server stores encrypted content rather than readable classroom information.

> **Status: foundation only.** This repository currently contains a responsive welcome screen and a SvelteKit + Cloudflare Workers scaffold. QR access, encryption, notifications, messages, photos, and storage are not implemented. Do not use it with real family data yet.

## What we’re building

- **One family QR card:** simple access across family devices.
- **Updates that find you:** generic push notifications for new classroom content.
- **A single feed:** notices, photos, and attachments together.
- **A private family conversation:** a direct line to teachers.
- **A practical photo workflow:** teachers mark a region and select a child; the app prepares a covered classroom image and private reveals for that child’s family.
- **Your own installation:** deploy to your own Cloudflare account.

Keep parents’ choices few, give teachers sensible defaults, and keep the implementation small enough to understand.

## Start locally

Use **Node.js 24 LTS** and npm. No Cloudflare account is needed for local development.

```sh
npm ci
npm run gen
npm run dev
```

Open the local address printed by Vite. `npm run gen` creates ignored Cloudflare runtime types from `wrangler.jsonc`; rerun it after changing bindings or updating Wrangler.

| Command            | Purpose                                        |
| ------------------ | ---------------------------------------------- |
| `npm run dev`      | Development server with hot reload             |
| `npm run gen`      | Generate Cloudflare binding/runtime types      |
| `npm run check`    | Svelte and TypeScript checks                   |
| `npm run lint`     | Check formatting with Prettier                 |
| `npm run format`   | Apply formatting                               |
| `npm run build`    | Build for Cloudflare Workers                   |
| `npm run preview`  | Run the built app in the local Workers runtime |
| `npm run validate` | Type checks, formatting, and production build  |
| `npm run deploy`   | Build and publish to your Cloudflare account   |

Measure performance (for example with Lighthouse) against `npm run build && npm run preview`, never `npm run dev`: the dev server serves unbundled, uncompressed modules and always scores poorly.

`lint` currently checks formatting; Svelte diagnostics and TypeScript run through `check`. No additional lint framework or test runner is installed yet. Add behavior tests with the first real auth/crypto/data flows.

## Deploy your own preview

1. Clone this repository and follow the local setup above.
2. Run `npx wrangler login` to authenticate to your Cloudflare account.
3. Choose a unique Worker `name` in `wrangler.jsonc`.
4. Run `npm run validate` and `npx wrangler deploy --dry-run`.
5. Run `npm run deploy`. Wrangler prints the deployed URL.

This deploys the public foundation preview, **not a working kindergarten service**. CI validates changes but does not deploy automatically. No credentials belong in Git. Local runtime secrets belong in ignored `.dev.vars`; production secrets should use `wrangler secret put` when the feature needing them exists.

### Storage when the first data feature lands

D1 and R2 are intentionally not provisioned by this bootstrap. No unused cloud resources or speculative database schema are required to run it.

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
| Planned storage       | D1 for records; private R2 for encrypted media  |
| Planned encryption    | Browser Web Crypto API                          |
| Planned notifications | Web Push                                        |

No component UI library, ORM, remote font service, analytics SDK, or separate backend. npm’s lockfile is committed for reproducible installs. The official tooling still has transitive dependencies; review additions and updates rather than assuming a small manifest means zero supply-chain risk.

```text
src/
  lib/
    assets/             Local brand assets and optimized photos
    components/         Reusable Svelte components
    styles/             Tailwind entry, theme tokens, base styles
  routes/               Pages, layouts, and future server endpoints
  app.d.ts              Typed Cloudflare platform boundary
  app.html              Document shell
static/                 Public static assets only
.github/workflows/      Validation pipeline
wrangler.jsonc          Worker and future binding configuration
```

## Privacy, precisely

The intended design encrypts sensitive content on users’ devices and does not give the server the keys needed to read stored content. It does **not** promise that every possible leak is harmless. A compromised device, shared QR card, saved photo, or malicious application update remains a risk. A host controls the JavaScript delivered to browsers; public source and deployment verification improve accountability, not mathematical isolation from that host.

Teachers manage family access and visibility choices. Removing access cannot recall saved copies or erase keys already held by a device. Kindergarten approval and consent remain part of operating the service.

See [architecture notes](docs/architecture.md) and the original [product specification](product-spec.md). The specification describes the target system; it is not an implementation or a security audit.

## Next slices

1. Teacher setup, recovery QR, and family enrollment.
2. An encrypted notice with push onboarding and a test notification on real iOS/Android devices.
3. Manual photo regions, consent lookup, private reveals, and exact audience previews.
4. Private messages and attachments.

Retention, authorization, deletion, and recovery belong in the features they protect. Photo tooling should load only when needed. Start with online content; offline libraries and queues can wait.

## License

[GNU Affero General Public License v3.0](LICENSE).

## Languages and theme

Croatian (`hr`) is the default; English (`en`) is available from the header. The choice persists for one year in a first-party language cookie. Server rendering sets the document language, metadata, and accessible labels consistently, without client-only language detection. Language switching works without JavaScript.

All interface copy lives in `src/lib/i18n/en.ts` and `hr.ts`. Croatian must satisfy the same TypeScript message shape as English; add each new key to both dictionaries. Keep sentences whole rather than assembling translated fragments. Use native `Intl` formatters with the active locale when dates, numbers, or pluralized content are introduced. User-authored classroom content is not automatically translated.

The look is cheerful glassmorphism: frosted white surfaces over soft coral, violet, sky, and sun gradients, with ink-black pill actions. Headings use Hedvig Letters Serif and body text uses Hanken Grotesk, both bundled from Fontsource (OFL) and served from the app origin. Styling uses Tailwind CSS v4 utilities in markup. Brand colors and fonts are `@theme` tokens in `src/lib/styles/app.css` (`ink`, `muted`, `canvas`, `accent`, `font-display`), plus two custom utilities: `glass` for frosted surfaces and `bg-sunrise` for the brand gradient. Prettier sorts Tailwind classes automatically. Photos are real stock images committed pre-optimized as AVIF/WebP and rendered with `src/lib/components/Photo.svelte`; sources and licenses are in `src/lib/assets/photos/CREDITS.md`. No remote images, remote fonts, or animation library are required.
