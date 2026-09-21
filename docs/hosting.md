# Hosting an installation

Each kindergarten runs its own BubbleBoard in its own Cloudflare account, usually looked after by a volunteer parent. This page covers deploying, storage limits, backups, and what the privacy design does and does not promise.

## Deploy

1. Clone this repository and follow the [local setup](development.md#start-locally).
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

## Storage

The Worker keeps its records in a D1 database bound as `DB`, with the schema in `migrations/`. `wrangler.jsonc` names the database without an ID, so the first deploy creates it in your account, and local development keeps its own copy in `.wrangler/`. Nothing in it is readable without a card: names live in encrypted profiles, and the server stores hashes of card and session tokens. See [Backup and restore](#backup-and-restore). Board photos and the files of notices and info pages are encrypted in the browser and kept in a private R2 bucket bound as `FILES`, which the first deploy creates as `bubbleboard-files`; only the Worker reads it, for devices that may see a photo or file.

Cloudflare’s free allowances may suit a small kindergarten, but usage limits and pricing still apply. On the Free plan, the Worker and D1 stop at their daily limits rather than charging, while R2 charges once a month’s use passes its free allowance of 10 GB stored, a million uploads, and ten million downloads, and Cloudflare offers no way to cap that. So the database counts every byte BubbleBoard keeps in R2 and every upload and download, and refuses more once a limit set in `.env` is reached, whoever asks:

| Setting                       | Default | Limits                                        |
| ----------------------------- | ------- | --------------------------------------------- |
| `STORAGE_LIMIT_GB`            | 9       | Photos and files kept in R2 at once           |
| `STORAGE_UPLOADS_PER_MONTH`   | 900000  | Photos and files put up in a month, across R2 |
| `STORAGE_DOWNLOADS_PER_MONTH` | 9000000 | Photos and files opened in a month, across R2 |

An event's photos are the heaviest thing an installation keeps. Each one is made smaller and compressed on the phone, and the faces it covers travel beside it as small lossless patches, which comes to roughly a megabyte for a photo: an event of thirty takes something like 20 MB of the allowance above, more when its photos are full of children. Two more settings say how much of an event a teacher may prepare, and are read when you build, as the address is:

| Setting                 | Default | Limits                                   |
| ----------------------- | ------- | ---------------------------------------- |
| `PUBLIC_EVENT_PHOTOS`   | 30      | Photos in one event                      |
| `PUBLIC_EVENT_PHOTO_MB` | 10      | The size of a photo a teacher may choose |

More photos also means more for a phone to hold while a teacher marks them, so raise these with your teachers' phones in mind.

The storage defaults stay a tenth below the free allowance; `0` stops uploads or downloads altogether. Months are counted in UTC. Teachers make room by taking down photos, deleting notices with files, and deleting closed inquiries whose messages carry files, and admins by taking files off info pages or deleting pages, which deletes their bytes right away; notices past their days leave with their files in the daily cleanup. Change a limit in `.env`, then run `npm run deploy`.

## Backup and restore

The database keeps its own history: Cloudflare can put it back as it was at any moment in the last 30 days (7 on the Workers Free plan), and this can't be turned off. Look up the bookmark for a moment, then restore to it. Restoring overwrites the database and prints a bookmark that undoes the restore. It also brings back cards replaced or removed since, so replace those again afterwards, and photos and files deleted since don't open until a teacher puts them up again.

```sh
npx wrangler d1 time-travel info DB --timestamp=2026-09-13T08:00:00+02:00
npx wrangler d1 time-travel restore DB --bookmark=<bookmark>
```

For a copy that lasts longer, export the database: `npx wrangler d1 export DB --remote --output=backup.sql`. It holds only encrypted records, IDs, and hashes, but keep it private. An export briefly holds up other requests to the database. To restore an export into a new, empty database, run `npx wrangler d1 execute DB --remote --file=backup.sql`.

Board photos and the files of notices and info pages in R2 have no backup: they're encrypted, notices leave after their days, and a teacher can put a lost one up again. Nothing above restores keys: keep the recovery QR code locked away and `VAPID_KEY` in a password manager. If every staff card is lost, the only way back is starting over.

## Privacy, precisely

The intended design encrypts sensitive content on users’ devices and does not give the server the keys needed to read stored content. It does **not** promise that every possible leak is harmless. A compromised device, shared QR card, saved photo, or malicious application update remains a risk. A host controls the JavaScript delivered to browsers; public source and deployment verification improve accountability, not mathematical isolation from that host.

Admins manage classrooms, teachers, and family cards. Every staff card opens the same Staff Key, so the server, not encryption, keeps each teacher to their own classrooms; families are kept apart by encryption. Removing access cannot recall saved copies or erase keys already held by a device. Kindergarten approval and consent remain part of operating the service.

Every installation serves a short privacy policy at `/privacy` and `/en/privacy`: what it stores, where, and for how long, with the project's contact address. It describes the current code, so keep it in step with changes (`privacyPolicy` in `src/lib/i18n/`).

See the [architecture notes](architecture.md), the [access format](access-format.md), and the [product specification](product-spec.md). The specification describes the target system, and its opening note lists the decisions that have since replaced parts of it; it is not an implementation or a security audit.
