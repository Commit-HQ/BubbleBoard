# BubbleBoard 🫧

**A little closer to their day.**

A small, open-source communication app for kindergarten communities. Inspired by a group called **Bubbles**, BubbleBoard aims to give families classroom updates, private conversations, and thoughtfully shared photos—without another daily place to check.

Teachers share a moment. Parents get a notification. The hosting server stores encrypted content without the keys needed to read it.

> **Status: first version, in use at one kindergarten.** This repository contains prerendered Croatian and English landing and privacy pages and the first part of the app: setting up a kindergarten, classrooms, teachers and admins, children with their family cards, printing cards, and connecting devices with a card's link, the camera, a photo of it, or its code, or, for a family's other devices, a one-time QR code shown on a connected one. Everything is encrypted in the browser ([access format](docs/access-format.md)). Teachers post notices, written with a rich text editor and sometimes with a poll or attached files, to the board on everyone's home, and families mark them as seen, answer the polls for their teachers, open the pictures on the whole screen, and save pictures and documents. Teachers also put up a photo of each classroom's corkboard, which its families see until a new one replaces it. Admins write info pages for the whole kindergarten, each on its paper with its own files and in the order they choose, which everyone opens from the header. Phones and tablets install the app before using it, and devices can turn on notifications for new notices and board photos, which carry no content; private inquiries now connect families with classroom teachers through titled conversations, and classroom photos are not implemented yet. The landing page deliberately describes the finished product; this README tracks what exists.

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

`.env` sets `PUBLIC_SITE_URL`, the public origin used for canonical links and link previews: `https://` and a hostname, with no path, query, or credentials (`http://localhost` also works). Pages are prerendered, so the address is written into the HTML at build time; a Worker variable set at runtime can't change pages that were already generated. The build stops with a message naming `PUBLIC_SITE_URL` when it's missing or invalid. It also holds the storage limits (see [Storage](#storage)). Local Worker secrets, such as the setup token, belong in the ignored `.dev.vars`.

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
2. Run `npx wrangler login` to authenticate to your Cloudflare account, and turn on R2 for that account in the Cloudflare dashboard (**Storage & databases → R2 → Overview**). Cloudflare asks for a payment method even within the free allowance, and until R2 is on, the deploy can't create the files bucket and stops with "R2 bucket 'bubbleboard-files' not found".
3. Choose a unique Worker `name` in `wrangler.jsonc`.
4. Set `PUBLIC_SITE_URL` in `.env` to the origin the site will be served from, such as `https://bubbleboard.example.com`. It is read when you build, as are the storage limits next to it, whose defaults keep R2 within its free allowance ([Storage](#storage)).
5. Run `npm run validate` and `npx wrangler deploy --dry-run`.
6. Run `npm run deploy`. The first deploy creates the database, the notifications queue, and the files bucket, applies the migrations, stores a new `SETUP_TOKEN` secret and the `VAPID_KEY` secret that signs notifications, and prints that key and a setup link. Cloudflare can't show a secret again, so save the key in a password manager: if the Worker is ever deleted or moves to another Cloudflare account, put it back with `npx wrangler secret put VAPID_KEY` after the first deploy there. Later deploys apply new migrations and leave both secrets alone: with a new `VAPID_KEY`, devices get no notifications until BubbleBoard renews them the next time it opens, and some browsers need them turned on again. When a deploy creates a resource, Wrangler also writes it into `wrangler.jsonc`; the deploy puts the file back as it was, so it stays the same for every installation, since later deploys find the resources by name.
7. To use your own domain, add it to the Worker in the Cloudflare dashboard (**Workers & Pages → your Worker → Settings → Domains & Routes**) before opening the setup link, which points at `PUBLIC_SITE_URL`. The domain must first be active in the same Cloudflare account: for a domain registered elsewhere, add it under **Domains**, turn off DNSSEC at the registrar if it's on, and replace the registrar's nameservers with the two Cloudflare shows. Turn on **Always Use HTTPS** for the domain (**SSL/TLS → Edge Certificates**): the app needs `https://`, and the domain otherwise also answers plain `http://`. Domains are kept out of `wrangler.jsonc` so the configuration works for every installation. Printed cards use the address setup was opened on, so set up on the final domain.
8. Open the setup link on the first admin's device, enter their name, and print or save both cards before continuing. Keep the recovery card somewhere safe: it can do everything an admin can.

The setup token only allows the first setup. If the link is lost before then, `npm run setup-link` replaces the token and prints a new link.

If setup finished but its cards were neither printed nor saved, the device that ran setup is still connected as the admin. Open BubbleBoard there, go to **Manage** and then **Teachers**, and use **Replace QR code** on your own name and on the recovery QR code, then print or save the new ones. The old ones stop working.

Start over only when no device or card can open BubbleBoard, for example when the setup page closed before it showed the cards. This deletes every record:

```sh
npx wrangler d1 execute DB --remote --file scripts/start-over.sql
npm run setup-link
```

Board photos and the files of notices and info pages stay in R2, where nothing can open them without the old keys, until a daily cleanup a day later deletes them, since no record names them anymore.

The landing page is the same on every installation: it names no kindergarten, and its contact details belong to the BubbleBoard project (`src/lib/project.ts`). No credentials belong in Git.

### Storage

The Worker keeps its records in a D1 database bound as `DB`, with the schema in `migrations/`. `wrangler.jsonc` names the database without an ID, so the first deploy creates it in your account, and local development keeps its own copy in `.wrangler/`. Nothing in it is readable without a card: names live in encrypted profiles, and the server stores hashes of card and session tokens. See [Backup and restore](#backup-and-restore). Board photos and the files of notices and info pages are encrypted in the browser and kept in a private R2 bucket bound as `FILES`, which the first deploy creates as `bubbleboard-files`; only the Worker reads it, for devices that may see a photo or file.

Cloudflare’s free allowances may suit a small kindergarten, but usage limits and pricing still apply. On the Free plan, the Worker and D1 stop at their daily limits rather than charging, while R2 charges once a month’s use passes its free allowance of 10 GB stored, a million uploads, and ten million downloads, and Cloudflare offers no way to cap that. So the database counts every byte BubbleBoard keeps in R2 and every upload and download, and refuses more once a limit set in `.env` is reached, whoever asks:

| Setting                       | Default | Limits                                        |
| ----------------------------- | ------- | --------------------------------------------- |
| `STORAGE_LIMIT_GB`            | 9       | Photos and files kept in R2 at once           |
| `STORAGE_UPLOADS_PER_MONTH`   | 900000  | Photos and files put up in a month, across R2 |
| `STORAGE_DOWNLOADS_PER_MONTH` | 9000000 | Photos and files opened in a month, across R2 |

The defaults stay a tenth below the free allowance; `0` stops uploads or downloads altogether. Months are counted in UTC. Teachers make room by taking down photos and deleting notices with files, and admins by taking files off info pages or deleting pages, which deletes their bytes right away; notices past their days leave with their files in the daily cleanup. Change a limit in `.env`, then run `npm run deploy`.

### Backup and restore

The database keeps its own history: Cloudflare can put it back as it was at any moment in the last 30 days (7 on the Workers Free plan), and this can't be turned off. Look up the bookmark for a moment, then restore to it. Restoring overwrites the database and prints a bookmark that undoes the restore. It also brings back cards replaced or removed since, so replace those again afterwards, and photos and files deleted since don't open until a teacher puts them up again.

```sh
npx wrangler d1 time-travel info DB --timestamp=2026-09-13T08:00:00+02:00
npx wrangler d1 time-travel restore DB --bookmark=<bookmark>
```

For a copy that lasts longer, export the database: `npx wrangler d1 export DB --remote --output=backup.sql`. It holds only encrypted records, IDs, and hashes, but keep it private. An export briefly holds up other requests to the database. To restore an export into a new, empty database, run `npx wrangler d1 execute DB --remote --file=backup.sql`.

Board photos and the files of notices and info pages in R2 have no backup: they're encrypted, notices leave after their days, and a teacher can put a lost one up again. Nothing above restores keys: keep the recovery QR code locked away and `VAPID_KEY` in a password manager. If every staff card is lost, the only way back is starting over.

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
    assets/             Local brand assets and optimized photos
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
  params/               Route matchers (language prefix, record IDs)
  routes/
    (marketing)/        Landing and privacy pages: static HTML without JavaScript
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
wrangler.jsonc          Worker, database, bucket, queue, schedule, and rate limit configuration
wrangler.build.jsonc    Where SvelteKit's adapter writes the build the Worker's entry imports
```

Croatian is served at `/` and English at `/en`, both as static HTML without client-side JavaScript. The app is at `/app` and `/en/app`. Language, design, font, and security conventions are in the [architecture notes](docs/architecture.md).

## Privacy, precisely

The intended design encrypts sensitive content on users’ devices and does not give the server the keys needed to read stored content. It does **not** promise that every possible leak is harmless. A compromised device, shared QR card, saved photo, or malicious application update remains a risk. A host controls the JavaScript delivered to browsers; public source and deployment verification improve accountability, not mathematical isolation from that host.

Admins manage classrooms, teachers, and family cards. Every staff card opens the same Staff Key, so the server, not encryption, keeps each teacher to their own classrooms; families are kept apart by encryption. Removing access cannot recall saved copies or erase keys already held by a device. Kindergarten approval and consent remain part of operating the service.

Every installation serves a short privacy policy at `/privacy` and `/en/privacy`: what it stores, where, and for how long, with the project's contact address. It describes the current code, so keep it in step with changes (`privacyPolicy` in `src/lib/i18n/`).

See the [architecture notes](docs/architecture.md), the [access format](docs/access-format.md), and the [product specification](docs/product-spec.md). The specification describes the target system, and its opening note lists the decisions that have since replaced parts of it; it is not an implementation or a security audit.

## Next slices

The first event-photo editor is available to staff from **Prepare event photos** on the board (`/app/event/new`, or `/en/app/event/new`). It opens up to 20 photos locally, detects faces on the device, lets teachers add missed covers, assign children with automatic advance, move and resize covers, undo/redo, and review flattened images with every marked face covered. It supports HEIC through the existing decoder. Detection is assistive; each photo needs a teacher's review. The model and runtime are self-hosted and load only when needed.

Events now include title/date/description, duration, parent consent settings, encrypted photo packages, immutable staging uploads, atomic publication, board cards, family galleries, downloads and deletion/expiry. Consent applies to future publications; every linked family must opt in for group sharing. The editor offers three opaque stickers and an optional before/after comparison. Drafts remain only on the open page. Apply migration `0019_events.sql` before running the feature; physical phone and pilot testing remain necessary. See [event decisions](docs/events-plan.md) and [editor behavior](docs/events-editor.md).

For local UI checks, `/editor-check` uses fictional children and a bundled stock photo without connecting a card. That fixture is available only in development and returns 404 in production.

1. Kindergarten setup, classrooms, teachers, children with family cards, and connecting devices. Implemented and deployed; card links work on real iPhone and Android phones, and a few checks remain.
2. Encrypted notices for chosen classrooms, with a rich editor, polls, files, notifications, and installing on phones and tablets, tried on real iOS and Android devices ([plan](docs/next-step-plan.md)).
3. Manual photo regions, consent lookup, private reveals, and exact audience previews.
4. Private messages — implemented as titled family inquiries with per-classroom sending hours and monthly new-inquiry allowances.

Retention, authorization, deletion, and recovery belong in the features they protect. Photo tooling should load only when needed. Start with online content; offline libraries and queues can wait.

## License

BubbleBoard is licensed under the [GNU Affero General Public License v3.0](LICENSE). The third-party photos, fonts, icons, and libraries it bundles keep their own licenses. Their notices are in [`static/third-party-notices.txt`](static/third-party-notices.txt), which every installation also serves at `/third-party-notices.txt`.

## Private inquiries

Messages live under **Messages** in the app header, whose four destinations are icons only. Each inquiry has an encrypted subject and a separate conversation, read as a chat: this device's messages on the right, the other side's on the left, under a chip for each day. The inbox lists who each conversation is with, its latest message and unread state. Its filters appear only where they help: subject search above five conversations, open/closed chips once something is closed, and the classroom picker only for families and teachers with more than one classroom. Older conversation messages load in batches of 50.

An admin sets **Parent messaging** in its own section under a classroom's children: a line saying whether families may write, with the allowance and the week's hours folded into one summary, and, once Change is pressed, the form itself — an on/off switch, the monthly allowance of inquiries per family, and one interval per weekday on a line each. Messaging starts disabled, with three inquiries a month; an allowance below one is refused. Saturday and Sunday are closed. Hours and calendar months use Europe/Zagreb, including daylight saving. Holidays are not detected; the interface explains that an answer may take longer on non-working days.

A family spends one inquiry on every message a teacher hasn't answered yet: the message that starts a conversation, and each further message sent while the family's own is still the last one. Answering a teacher's message is always free, so an open conversation can't be used to write without limit, and the app says what the next message costs and asks for confirmation before spending an inquiry. Teachers are never charged and may send at any time; the switch and hours still apply to every family message. Teachers close inquiries; closed inquiries remain readable and never give an inquiry back. All devices of a family share the allowance and read state; each teacher has their own read state. Assigned teachers receive notifications, and all devices of the family receive replies, when push is enabled. Admins can access all classrooms, as elsewhere in the app, but receive pushes only for classrooms they teach.

Subjects, message bodies and teacher display names use the Family Key. The server keeps only routing, author IDs, ordering, read progress and policy metadata. An inquiry stays until its family membership in that classroom is removed, which deletes its messages and read progress. Rotating a QR card does not delete conversations. No attachments, editing, reopening or individual message deletion are supported in this first version. Migration `0015_messages.sql` adds the records; apply it with the existing deployment workflow.

### Individual meetings

The home card opens the meetings page for staff and families. Staff select a date, time window and meeting length, remove break times, and publish. Families reserve one time per child per offer; other families see that a slot is booked without seeing who booked it. Both family cards invited for a child share its reservation. Staff see booked children and can cancel their own meetings; admins can manage all offers. Cancellation releases a time, and past offers are removed 90 days after their last slot.

Invitations include children and family cards linked when the offer is published. Newly added children or family cards participate in the next offer. Times use Europe/Zagreb regardless of device timezone. Names stay encrypted; times and child/family ID links are scheduling metadata. Notifications follow the existing generic push flow to home. Migration `0016_meetings.sql` is applied by the normal development/deployment workflow. No additional calendar dependency is required.
