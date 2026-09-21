<p align="center">
  <img src="src/lib/assets/app-icon.svg" width="96" alt="">
</p>

<h1 align="center">BubbleBoard 🫧</h1>

<p align="center">
  <strong>A little closer to their day.</strong><br>
  A free, open-source app that replaces the kindergarten corkboard.
</p>

<p align="center">
  <a href="https://bubbleboard.fyi">See it live</a> ·
  <a href="docs/hosting.md">Host your own</a> ·
  <a href="#contributing">Contribute</a>
</p>

---

“What happened at kindergarten today?” “Nothing.” 🙃

BubbleBoard shows families everything else: notices from the teachers, photos from the trip, and answers to their questions. It's named after a real group of kids called **Bubbles**, and it's in use at their kindergarten.

No sign-ups, no ads, no tracking. Each kindergarten runs its own copy, and everything families and teachers share is encrypted on their phones before it leaves them, so the server only ever holds content it can't read.

## What it does

- 🪪 **QR cards instead of passwords.** One printed card for a family's devices, one for each teacher.
- 📌 **A notice board.** Rich notices with polls and files, plus a photo of the real corkboard.
- 📸 **Photos with care.** Faces are found on the teacher's phone and covered with cheerful stickers. Each family decides who may see their child.
- 💬 **Private questions.** A quiet, direct line between a family and their teachers.
- 🗓️ **Individual meetings.** Teachers publish times, parents pick one.
- 🔔 **Notifications that say nothing.** A push tells you something is new, never what or about whom.
- 🌍 **Croatian and English**, installable on phones and tablets.

More detail on what's implemented is in [docs/status.md](docs/status.md).

## Run it locally

You need **Node.js 24** and npm. No Cloudflare account required.

```sh
npm ci
cp .env.example .env
npm run setup-link:local
npm run dev
```

Open the setup link the third command prints, enter a name, and you're the first admin of your own tiny kindergarten. The full walkthrough is in [docs/development.md](docs/development.md).

## Built small on purpose

Svelte 5 and SvelteKit in strict TypeScript, Tailwind CSS v4, and the browser's own Web Crypto. It runs on Cloudflare Workers with D1 for records, R2 for encrypted files, and a Queue for Web Push.

No UI library, no ORM, no analytics, no separate backend. We'd like a curious parent to be able to read the whole thing.

## Host it for your kindergarten

An installation is usually looked after by a volunteer parent, and Cloudflare's free allowances suit a small kindergarten. Built-in storage limits are there to keep it within them, so hosting doesn't surprise you with a bill. [docs/hosting.md](docs/hosting.md) walks through deploying, limits, and backups.

Not sure where to start? Write to us at [commit-devs@proton.me](mailto:commit-devs@proton.me) and we'll gladly help you get going.

## Privacy, honestly

Content is encrypted on people's devices and the server never gets the keys. That's a strong design, not a magic one: a compromised phone, a shared QR card, or a saved photo is still a risk, and whoever hosts an installation controls the code its browsers receive. Public source keeps us accountable. The details are in the [access format](docs/access-format.md) and [hosting notes](docs/hosting.md#privacy-precisely).

## Contributing

Pull requests, ideas, and bug reports are all welcome. 💛

- Run `npm run validate` before opening a pull request. CI runs the same checks and never deploys.
- Add interface copy to both `src/lib/i18n/en.ts` and `hr.ts`.
- Bundling a new asset or library? Add its license to `static/third-party-notices.txt`.

Conventions live in the [architecture notes](docs/architecture.md), and the original vision in the [product specification](docs/product-spec.md).

## Made by Commit

[Commit](https://github.com/Commit-HQ) is a small team building free, open-source apps for the everyday problems regular people face. BubbleBoard started with one parent wanting to feel a little closer to their kid's day. If it helps your kindergarten too, that's the whole point.

## License

[GNU AGPL v3.0](LICENSE). Bundled photos, fonts, icons, and libraries keep their own licenses, listed in [`static/third-party-notices.txt`](static/third-party-notices.txt).
