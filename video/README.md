# BubbleBoard reel

A 72-second motion-graphics reel of BubbleBoard, in English and Croatian: [`bubbleboard-en.mp4`](bubbleboard-en.mp4) and [`bubbleboard-hr.mp4`](bubbleboard-hr.mp4), 1920 × 1080 at 60 frames a second, with a soundtrack.

It's made from code, like the app. The scenes are HTML and SVG drawn in the app's own fonts, colours, stickers, and real screens (`src/lib/assets`), and the music and sound effects are synthesized from nothing, so there are no samples to license and the reel can be rendered again whenever the app changes.

## What's in it

1. **“What did you do today?” “Nothing.”** The answer every parent knows floats off as a soap bubble and pops.
2. **The logo**, built from the bubbles of the pop.
3. **The notice board**, pinned up paper by paper and swept into a phone, with a live poll and seen marks.
4. **QR cards instead of passwords**, a real code the card's own library makes, scanned and connected.
5. **Photos with care**: faces found on the teacher's phone, stickers popping onto them, and one family's own child uncovered.
6. **Private questions** to the teachers, typed and answered.
7. **Individual meetings**, picked with a tap.
8. **Your phone lets you know**, on its lock screen, so nothing slips past.
9. **Locked on your phone first**: a message crosses the server as a jumble the server can't read.
10. **Croatian and English** on a split-flap board.
11. **No sign-ups, no ads, no tracking**, then free and open source over the app's real code, and what it's built with.
12. **Everything in one place**: a wall of the app's screens, drawn into one bubble that pops into the end card.

## How it works

Everything on screen is a function of time. `reel.js` mounts each scene in `scenes/` once, and `reel.renderFrame(t)` puts the whole stage where it is at `t` seconds, so any frame renders the same in any order. Scenes start on the bar lines of `timeline.js`, which the score shares, so cuts land on the beat.

- `copy.js` holds every word in both languages, in the app's own phrasing where the app already says it.
- `lib/` has the timing curves and springs, the brand's pieces (bubbles, the icon, phones, stickers, papers), and effects such as motion blur and whip pans.
- Scenes ask for sounds with `ctx.cue(time, kind)`. `score.js` arranges the tune on the same bars and adds a sound for every cue, then mixes and masters it to a WAV.
- `render.js` serves the repository to headless Chromium, steps four browsers through the frames in parallel, and encodes the frames and the score with ffmpeg.

## Preview and render

You need the repository's dependencies (`npm ci`, for the fonts), ffmpeg with x264, SVT-AV1, Opus, libaom, and WebP, as most builds of it have, and Playwright with Chromium (`npx playwright install chromium`).

```sh
node video/render.js --preview
```

Open a printed address to play the reel in the browser: space plays and pauses, the arrows step a frame (a second with Shift), and `?t=27` opens at a moment.

```sh
node video/render.js
```

Renders both languages to `video/bubbleboard-en.mp4` and `video/bubbleboard-hr.mp4`, then encodes the landing page's copies of each (below), in about twenty minutes a language, most of it AV1. `--lang hr` renders one, `--from 26 --to 32` a stretch into `video/out`, `--still 9.5,27` single frames as PNGs, `--score` only the soundtrack, and `--web` only the landing page's copies, from the rendered reels.

## On the landing page

The landing page shows the reel under its hero, from copies made for the web in `src/lib/assets/tour`: AV1 in ten bits, which keeps the soft gradients from banding, and H.264 for browsers without AV1, each at 1080p for dense screens and 720p for phones, at 60 frames a second with a key frame every two seconds, and a poster rendered straight from the stage at 4.9 seconds in AVIF and WebP. `src/lib/tour.ts` names their codecs for the page's `<source>` elements, and `npm test` checks them against the files, so change both together. [The architecture notes](../docs/architecture.md#pages-and-languages) explain how the page plays them, and why the Worker serves their byte ranges.

## Credits

The photos are the landing page's Pexels photos and the screens are the app's own, credited in [`static/third-party-notices.txt`](../static/third-party-notices.txt) with the fonts and the line icons. The music and sound are synthesized by `score.js`.
