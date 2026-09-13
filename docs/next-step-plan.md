# Next step: notices with notifications

## Outcome

A teacher posts a notice to one or more classrooms: formatted text with emoji on a paper colour, kept for the number of days they choose. Families in those classrooms and their teachers get a generic notification and open the notice, decrypted on their device. The author or an admin can edit or delete it at any time. On phones and tablets, parents install BubbleBoard before using it; on computers, it also works in the browser.

The kindergarten access slice, recorded at the end, is implemented; its checks on a real installation come first. Photos follow this slice.

## Decisions from the notices design session — 2026-09-12

BubbleBoard replaces the corkboard in the kindergarten hallway, so putting up a notice should be as easy and cheerful as pinning a note to it.

- **Home is the board.** Everyone's home shows notices, newest first, each with its classrooms, author, and time, on its paper colour. Staff see "New notice" above the notices; since 2026-09-13 their tiles are on Manage, opened from the header, and Settings hold the device's card, notifications, and language. With more than one classroom, a filter shows one classroom's notices, starting on all of them; with one, home names it. Admins see every classroom's notices, teachers their classrooms', and families their children's classrooms'; a family with children in two of a notice's classrooms sees it once. A family that joins later sees the notices that are still up, as on the real board.
- **Audience:** a notice goes to the classrooms ticked when posting: a teacher's own, or any or all for an admin.
- **Writing:** a rich editor with bold, lists, a few text colours, links, and emoji ([Editor](#editor)). The background is one of about six soft paper colours from the app's palette, or white, and text colours are limited to those readable on every paper. The author's name is stored inside the encrypted notice, because families can't open teacher records; a notice posted with the recovery card has no author name.
- **Keeping and changing:** when posting, the teacher chooses how long the notice stays: 1, 3, 7, 14, 30, 60, or 90 days, with 30 preselected, counted from when it was first posted. The author and admins can change everything about a notice, its classrooms and days included, and choose whether the change notifies everyone again; a changed notice says it was edited, and one that notifies again moves to the top. They can also delete it at once. A removed teacher's notices stay until they expire or an admin deletes them. Expired and deleted notices leave every board at its next load, and the server deletes them (spec §52).
- **Encryption:** every save makes a new random Notice Key. The notice's text, colour, and author name are encrypted once with it, and the key is wrapped with the Group Key of each chosen classroom: a notice for twenty classrooms is one envelope and twenty small keys, and a classroom taken off a notice can't open its later versions. Staff open Group Keys with the Staff Key, families with their Family Key. The server stores the notice's ID, the author's teacher ID, its classrooms and times, and the envelopes. The new purposes go into docs/access-format.md with the implementation.
- **Who is notified:** devices that turned on notifications, for a family in one of the notice's classrooms or a teacher assigned to one, except the device that posted. Admins aren't notified for classrooms they aren't assigned to. The notification says only "New notice from your kindergarten" or "Nova obavijest iz vrtića", in the language notifications were turned on in.
- **Turning notifications on:** a connected device's home shows a card, "Get a notification when there's a new notice", with Turn on and Not now. Turn on asks for permission from that tap, then sends a test notification. Not now hides the card on that device; Settings always have the switch. If permission was refused, the card explains how to allow it in the device's settings, because the browser won't ask again. Where push can't work, the card isn't shown.
- **Installing on phones and tablets is required.** Notifications are why parents use BubbleBoard, and on iPhone and iPad they work only in the Home Screen app, so on phones and tablets BubbleBoard works only once installed. That holds for every card, because a card link doesn't say whose card it is. On iPhone and iPad, a card link from the camera opens Safari, whose storage the Home Screen app doesn't share, so Safari connects nothing and shows short Add to Home Screen steps; the parent then connects inside the installed app with Scan card or the code. On Android, the browser connects first, because Chrome's installed app shares its connection, then asks to install, with the browser's install prompt where it has one and short steps otherwise, so the parent scans only once. An in-app browser that can't install, such as a chat app's, asks to open the link in Safari or Chrome. Computers work in the browser, where installing is optional.
- **Words:** notice and notification in English. Croatian keeps "obavijest" for both, as the landing page does.
- **Delivery:** pushes carry no content. The service worker always shows the fixed text, so the server needs no payload encryption, and every push shows a notification, as Safari requires. Publishing puts the devices to notify on a Cloudflare Queue in groups of 40, below the Free plan's 50 outgoing requests per invocation. The same Worker sends each group with the installation's VAPID key, retries 429 and 5xx responses later, and deletes subscriptions the push service reports gone (404 and 410). SvelteKit's Cloudflare adapter builds only a `fetch` handler, so a small Worker entry file adds the queue consumer and a daily cleanup of expired notices.
- **Subscriptions** belong to the session that created them (spec §39): signing out, a replaced card, a removed teacher or family, or an expired session deletes them. The app sends its subscription whenever it opens, which keeps it current and moves it to a new session. The VAPID key pair is one Worker secret per installation, created when missing by `npm run deploy` and by local setup, like the setup token, and never rotated: a new key silently ends every subscription.
- **Installing:** a web app manifest for each language, starting at `/app` or `/en/app`, with the same app ID and scope, PNG icons, and an Apple touch icon. The service worker handles only pushes and notification taps: no caching or offline copies. Chrome shows its own install prompt only to sites whose service worker handles requests, so Android usually shows the menu steps; installing from the menu needs no service worker.

### Editor

Tiptap 3 (MIT), chosen by the owner on 2026-09-12. It doesn't depend on a framework, so the notice form creates and destroys the editor itself, without a wrapper package, and the editor loads only on the page where notices are written.

- **Tools:** bold, italic, bullet and numbered lists, links, a few text colours, and emoji. Markdown typed as you go, such as `- ` for a list or `**bold**`, formats the text. StarterKit's headings, code, quotes, strikethrough, underline, and rules are turned off, so a notice stays simple.
- **Storage:** a notice keeps Tiptap's JSON document inside its encrypted envelope. Boards check it against the allowed nodes, marks, and colours and render it with the app's own components, never as HTML. Links open only `https:` and `mailto:` addresses.
- **CSP:** the editor's injected stylesheet is off (`injectCSS: false`), with its few rules in `app.css`. Tiptap's Color extension writes inline `style` attributes, which the CSP blocks, so text colour is a small mark of our own that renders a class from the fixed palette.
- **Emoji:** phone keyboards have them, and a small picker in the toolbar offers a few classroom emoji on every device, without bundling an emoji data set.

## Deferred

- Unread markers and app icon badges.
- Declarative Web Push (iOS 18.4 and later), which needs an encrypted payload.
- Scheduled, pinned, or recurring notices; reactions, comments, and read receipts, which would tell the server who read what.
- Files and images in notices, which come with documents and photos.

## Scope and constraints

- Croatian and English throughout, including install steps and notification text.
- The editor loads only on the page where notices are written. Boards render a notice's stored structure with the app's own components, never as HTML (spec §36). Colours and backgrounds are classes from a fixed set, because the CSP allows no inline styles.
- The server authorizes every request: teachers post, change, and delete in their assigned classrooms, admins everywhere, and families read their children's classrooms. Every staff card opens the same Staff Key, so check each new query against that trade-off (docs/access-format.md).
- The Free plan keeps working: queue operations and D1 writes per notice stay small, and nothing polls.
- No offline content, background sync, or notice content in notifications.

## Review and acceptance evidence

Build this slice in reviewable checkpoints. At the owner's request (2026-09-12), Claude commits each checkpoint on the `notices` branch once `npm run validate` passes, and the owner reviews the commits. Use synthetic people and content until the access boundary is reviewed; this is a review gate for real data, not a new approval flow for routine development.

Before calling the slice complete, demonstrate:

1. A notice to two classrooms reaching a family with children in both once, a family in one of them, and their teachers, but not an unassigned admin, with notifications on a real iPhone Home Screen app, an Android phone, and a desktop browser.
2. Installing on iPhone, iPad, and Android before BubbleBoard opens, from a card link and from an in-app browser, and connecting in the installed iPhone app with Scan card and with the code.
3. Changing a notice with and without notifying again, deleting one, and expiry, each removing the old notice from every board and from D1.
4. Notifications stopping after signing out, a replaced card, a removed teacher or family, and an expired session, and gone subscriptions being deleted.
5. Automated tests for Notice Key wrapping and wrong-key, tampering, and context failures; authorization for posting, changing, deleting, and reading across classrooms; and delivery groups, retries, and cleanup.
6. The production build with its CSP, manifest, and service worker, and Croatian and English phone and desktop walkthroughs.
7. A D1 export and captured requests showing no notice text, colours, or names in plaintext, and pushes without content.

## First: finish checking kindergarten access on the real installation

The access slice is deployed and passes `npm run validate`. Card links from the iPhone and Android camera apps, and Scan card in the app, connect families there, so the landing page links to the app. Still to check:

- a D1 export and captured requests, once the first notice checkpoints exist: no names, content, or card secrets, only tokens, hashes, and ciphertext;
- setup, a family card, and a second device in Croatian and English, on a phone and a desktop.

## Earlier decisions: kindergarten access — 2026-09-12

Where the user experience is concerned, the simplest option won; deferred variants need no data migration later. The notices decisions above take precedence where they differ.

- **A kindergarten, not a classroom.** An installation holds any number of classrooms and one catalog of children and families. The spec's Teacher Key for each classroom becomes one **Staff Key** for the kindergarten, opened by every staff card. The server enforces which classrooms teachers see and what admins may change; families stay separated by encryption. docs/access-format.md records the trade-off.
- **Roles:** an admin is a teacher who also manages classrooms, teachers, children, and family cards. There can be several, and the last working admin card can't be revoked. Teachers see the children and family cards of their own classrooms and can replace those families' cards; later they post notices and photos there.
- **First admin:** `npm run deploy` creates the `SETUP_TOKEN` Worker secret when it's missing and prints a setup link (`/app/setup#token=…`) once. `npm run setup-link` replaces the token and prints a new link. Pasting the token works too, and it only permits the first setup.
- **Setup** asks for the admin's name only. It creates the admin's card and a recovery card, an admin without classrooms, connects the setup device, and ends on a print page that asks for confirmation. Card codes are never stored in the browser: the page retries while open. If the cards weren't printed, the setup device, which stays connected, replaces both; the install docs keep starting over for when no device or card works, such as a setup that succeeded after its page closed.
- **Classrooms** can be added and renamed, and deleted only when they have no children.
- **Teachers:** "Add teacher" asks for a name, classrooms, and whether they're an admin, then shows their card. Replacing a lost card keeps the classrooms and admin setting. If every admin card is lost, the recovery card is the answer; a command that makes a teacher an admin can come later.
- **Children and families:** a child has a name and one classroom. A family has one named card, such as "Ivana (mum)", used on every device at home, and one or more children. A sibling is added with the brother's or sister's family cards; parents who live apart get separate cards ("Add another family card"). A family's classrooms follow from its children, so moving a child moves its families' access. Removing a child also removes family cards left without children, after a confirmation that names them. "Replace card" issues a new card and disconnects every device that used the old one. Add child keeps each new family card on the page and clears the form for the next child, so a classroom's cards print together; leaving with cards unprinted asks first. A classroom's page replaces any selection of its families' cards at once, for the staff who may replace them, and prints the new cards together: for cards that were never printed, or were lost.
- **Parents** use one card for all their children's classrooms. They see a built-in "You've joined" screen naming their classrooms, which the board replaces.
- **Cards:** a 128-bit secret as a 28-character typeable code with two check characters, carried in the QR link as `#card=`. Every card has the same format; the server knows what a card is. Card derivation is versioned separately from envelopes, with a fixed compatibility test (docs/access-format.md). Cards print plain, on white, two to a row with a dashed edge to cut along. Their QR code fills a round bubble with dots in the brand's dark colours: the code in the middle, with ring-shaped finder patterns and a small round app icon that quartile error correction covers, and random dots around it that keep clear of the finder patterns. A code big enough to have an alignment pattern in its middle leaves the icon out.
- **Connecting:** a phone's camera opens the card link; in the app, "Scan card" reads the code with the camera, with "Choose a photo" in the same view for devices without a camera or where it isn't allowed, and "Enter code" accepts the typed code.
- **One active card per browser.** A working card is never replaced without confirmation, and device keys are stored per card.
- **Names** of classrooms, teachers, children, and family cards live only in encrypted records.
- **Screens:** home has a tile for each of the viewer's classrooms (every classroom for admins), Add classroom and Teachers for admins, and This device. Since 2026-09-13 those tiles are on Manage, with Teachers in a section of its own below the classrooms, and This device became Settings, both opened from the header. Add classroom turns over to take the new classroom's name in its own place. A classroom lists its children. A child's page shows its family cards, with siblings and their classrooms, and the actions the viewer may take; teachers see only siblings in their own classrooms.

Deferred from that slice:

- Expiry for staff cards (spec §32); staff cards are permanent for now.
- A family card replacement that keeps devices connected.
- A kindergarten-wide Families list.
- An admin reset for a suspected key compromise; it stays a documented procedure. Revocation stops server access but doesn't erase keys or copies a device already has.
