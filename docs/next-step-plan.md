# Next step: teacher setup and family access

## Outcome

An admin sets up the kindergarten and saves a recovery card, adds classrooms and teachers, and adds children with family cards. A parent opens BubbleBoard on another device, scans a family card, and sees the names of their children's classrooms, decrypted locally. The same card works on every device at home. Removing access blocks subsequent authenticated requests.

This is the first working product slice, built with fictional data. Notices with push are the immediate next slice; photos follow.

## Decisions from the access design sessions — 2026-09-12

Where the user experience is concerned, the simplest option won; deferred variants need no data migration later.

- **A kindergarten, not a classroom.** An installation holds any number of classrooms and one catalog of children and families. The spec's Teacher Key for each classroom becomes one **Staff Key** for the kindergarten, opened by every staff card. The server enforces which classrooms teachers see and what admins may change; families stay separated by encryption. docs/access-format.md records the trade-off.
- **Roles:** an admin is a teacher who also manages classrooms, teachers, children, and family cards. There can be several, and the last working admin card can't be revoked. Teachers see the children and family cards of their own classrooms and can replace those families' cards; later they post notices and photos there.
- **First admin:** `npm run deploy` creates the `SETUP_TOKEN` Worker secret when it's missing and prints a setup link (`/app/setup#token=…`) once. `npm run setup-link` replaces the token and prints a new link. Pasting the token works too, and it only permits the first setup.
- **Setup** asks for the admin's name only. It creates the admin's card and a recovery card, an admin without classrooms, connects the setup device, and ends on a print page that asks for confirmation. Card codes are never stored in the browser: the page retries while open, and the install docs explain starting over if setup succeeds after the page has closed.
- **Classrooms** can be added and renamed, and deleted only when they have no children.
- **Teachers:** "Add teacher" asks for a name, classrooms, and whether they're an admin, then shows their card. Replacing a lost card keeps the classrooms and admin setting. If every admin card is lost, the recovery card is the answer; a command that makes a teacher an admin can come later.
- **Children and families:** a child has a name and one classroom. A family has one named card, such as "Ivana (mum)", used on every device at home, and one or more children. A sibling is added with the brother's or sister's family cards; parents who live apart get separate cards ("Add another family card"). A family's classrooms follow from its children, so moving a child moves its families' access. Removing a child also removes family cards left without children, after a confirmation that names them. "Replace card" issues a new card and disconnects every device that used the old one.
- **Parents** use one card for all their children's classrooms. They see a built-in "You've joined" screen naming their classrooms, and the empty feed; how one feed shows several classrooms is decided with notices.
- **Cards:** a 128-bit secret as a 28-character typeable code with two check characters, carried in the QR link as `#card=`. Every card has the same format; the server knows what a card is. Card derivation is versioned separately from envelopes, with a fixed compatibility test (docs/access-format.md).
- **Connecting:** a phone's camera opens the card link; in the app, "Scan card" takes or chooses a photo and "Enter code" accepts the typed code.
- **One active card per browser.** A working card is never replaced without confirmation, and device keys are stored per card.
- **Names** of classrooms, teachers, children, and family cards live only in encrypted records.
- **Screens:** home has a tile for each of the viewer's classrooms (every classroom for admins), Add classroom and Teachers for admins, and This device. A classroom lists its children. A child's page shows its family cards, with siblings and their classrooms, and the actions the viewer may take; teachers see only siblings in their own classrooms. When notices arrive, decide whether they become a tile or the home screen.

## Deferred

- Expiry for staff cards (spec §32); staff cards are permanent for now.
- A family card replacement that keeps devices connected.
- A live camera scanner.
- A kindergarten-wide Families list.
- An admin reset for a suspected key compromise; it stays a documented procedure. Revocation stops server access but doesn't erase keys or copies a device already has.

## Scope and constraints

- One installation per kindergarten.
- Croatian and English throughout the app, including errors and recovery instructions.
- The marketing URLs stay `/` and `/en`. App URLs are `/app` and `/en/app`; setup is `/app/setup` and `/en/app/setup`. Route construction stays centralized and QR parsing independent of translated copy.
- No email/password accounts, external identity provider, ORM, global state framework, or device-specific encryption hierarchy.
- D1 for the access records. R2 is unnecessary until media exists.
- No messaging UI, document uploads, face editor, offline content library, or notification permission prompt in this slice, and no controls that pretend those features work.
- Route handlers and a few cohesive modules: client crypto, local key storage, server sessions and access, and database operations. No repository, service, or controller layer for each table. Server-only helpers belong under `src/lib/server`; browser keys never cross that boundary.

## Review and acceptance evidence

Return this slice in reviewable checkpoints. The owner reviews and commits each checkpoint; agents do not commit automatically.

Before calling the slice complete, demonstrate:

1. Fresh local setup using documented commands and D1 migrations, with no remote account needed.
2. Admin setup → saved recovery card → family card → another device opening its classrooms.
3. Family card replacement, device disconnection, teacher card revocation, and recovery card tests.
4. Automated wrong-key, tampering, and context tests, and authorization and isolation tests.
5. Production build and CSP verification, plus Croatian/English phone and desktop walkthroughs.
6. A real iPhone and Android check of QR scanning or import and browser storage behavior. PWA installation isn't required for this slice; notification onboarding and the browser-to-installed-app handoff are verified in the next slice.
7. Inspection of a local D1 export and captured requests showing that test names, content, and card secrets are absent from server persistence and requests, while expected auth tokens and ciphertext are present.

Use synthetic people and content until the access boundary is reviewed. This is a review gate for real data, not a new approval flow for routine development.

## Immediately afterward: encrypted notices with push

Teacher publishes an encrypted notice; a family receives a generic notification and opens the decrypted notice. Add manifest/service-worker installation, notification enrollment and a test notification, session-owned subscriptions, revoke/expiry cleanup, and simple retry handling as part of that complete flow. Keep push prominent and test actual iOS/Android behavior before expanding into photo work.
