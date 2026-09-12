# Next step: teacher setup and family access

## Outcome

An admin sets up the kindergarten and saves a recovery card, adds a classroom and a teacher, and adds a child with a family card. A parent opens BubbleBoard on another device, scans that card, and sees the classroom's name decrypted locally. The same card works on a second family device and opens every classroom the family's children are in. Removing access blocks subsequent authenticated requests.

This is the first working product slice. Build it with fictional classroom data first. Notices with push are the immediate next slice; photos follow. Do not spend another iteration redesigning the landing page.

## Decisions from the access design sessions — 2026-09-12

These replace the sections below where they differ. Where the user experience is concerned, the simplest option won; deferred variants need no data migration later.

- **A kindergarten, not a classroom.** An installation holds any number of classrooms and one catalog of children and families. The spec's Teacher Key for each classroom becomes one **Staff Key** for the kindergarten, opened by every staff card. The server enforces which classrooms teachers see and what admins may change; families stay separated by encryption. docs/access-format.md records the trade-off.
- **Roles:** an admin is a teacher who also manages classrooms, teachers, children, and family cards. There can be several, and the last working admin card can't be revoked. Teachers see the children and family cards of their own classrooms and can replace those families' cards; later they post notices and photos there. Staff cards are permanent for now; credential expiry (step 6) is deferred.
- **First admin:** `npm run deploy` creates the `SETUP_TOKEN` Worker secret when it's missing and prints a setup link (`/app/setup#token=…`) once. `npm run setup-link` replaces the token and prints a new link. Pasting the token works too, and it only permits the first setup.
- **Setup** asks for the admin's name only. It creates the admin's card and a recovery card, an admin without classrooms, connects the setup device, and ends on a print page that asks for confirmation. Card codes are never stored in the browser: the page retries while open, and the install docs explain starting over if setup succeeds after the page has closed.
- **Classrooms** can be added and renamed, and deleted only when they have no children.
- **Teachers:** "Add teacher" asks for a name, classrooms, and whether they're an admin, then shows their card. Replacing a lost card keeps the classrooms and admin setting. If every admin card is lost, the recovery card is the answer; a command that makes a teacher an admin can come later.
- **Children and families:** a child has a name and one classroom. A family has one named card, such as "Ivana (mum)", used on every device at home, and one or more children. A sibling is added with the brother's or sister's family cards; parents who live apart get separate cards ("Add another family card"). A family's classrooms follow from its children, so moving a child moves its families' access. Removing a child also removes family cards left without children, after a confirmation that names them. "Replace card" issues a new card and disconnects every device that used the old one; the spec's replacement that keeps devices connected is deferred.
- **Parents** use one card for all their children's classrooms. They see a built-in "You've joined" screen naming their classrooms, and the empty feed; how one feed shows several classrooms is decided with notices.
- **Cards:** a 128-bit secret as a 28-character typeable code with two check characters, carried in the QR link as `#card=`. Every card has the same format; the server knows what a card is. Card derivation is versioned separately from envelopes, with a fixed compatibility test (docs/access-format.md).
- **Connecting:** a phone's camera opens the card link; in the app, "Scan card" takes or chooses a photo and "Enter code" accepts the typed code. A live camera scanner comes later.
- **One active card per browser.** A working card is never replaced without confirmation, and device keys are stored per card.
- **Names** of classrooms, teachers, children, and family cards live only in encrypted records.
- **Screens:** home has a tile for each of the viewer's classrooms (every classroom for admins), Add classroom and Teachers for admins, and This device. A classroom lists its children. A child's page shows its family cards, with siblings and their classrooms, and the actions the viewer may take; teachers see only siblings in their own classrooms. A kindergarten-wide Families list can come later. When notices arrive, decide whether they become a tile or the home screen.
- **Checkpoints:** (1) app shell and access format, including these card and key decisions; (2) staff access: D1, setup token and link, setup and printing, connecting by link, photo, or code, classrooms, teachers with their classrooms and admin rights, replacing and revoking staff cards, signing out, sessions and rate limits; (3) children and families: the catalog, family cards, replacing and removing them, parent connection, and isolation tests for families and for teachers' classrooms.

## Quick review of the current polish — 2026-09-12

The changes follow the revised direction: present-tense product copy, a smaller component surface, no new dependencies, typed photos, validated site origin, local third-party notices, reduced repeated blur, and clearer documentation. The marketing/application split is correctly deferred until this feature introduces the first app route.

`npm run validate` passes: zero Svelte/TypeScript errors or warnings, formatting and production build succeed. This quick review did not repeat real-device performance or visual/accessibility testing.

Two small notes, neither requiring another architecture pass:

- In both language dictionaries, qualify “A leak would reveal no photos, names, or messages” as a leak of stored encrypted content **without the device keys**. Keep present tense. This describes the actual boundary without suggesting every kind of leak is harmless.
- The build label deliberately ignores untracked files. Newly added application files can therefore produce a build labeled with a clean commit. When touching build provenance next, either include non-ignored untracked source files in the dirty check or document this limit. Do not expand this into a build-attestation project.

The spec now records the full retention choices and one Cloudflare account per kindergarten. Follow those written decisions for planning; storage retention is outside this access slice.

## Scope and constraints

- One installation per kindergarten. Support one classroom through the first setup flow, without hardcoding the schema to prevent additional classrooms later.
- Croatian and English throughout the app, including errors and recovery instructions.
- Keep the existing marketing URLs `/` and `/en`. App URLs are `/app` and `/en/app`; setup is `/app/setup` and `/en/app/setup`. Keep route construction centralized and QR parsing independent of translated copy.
- No email/password accounts, external identity provider, ORM, global state framework, or device-specific encryption hierarchy.
- Use D1 for the access records. R2 is unnecessary until media exists.
- No messaging UI, document uploads, face editor, offline content library, or notification permission prompt in this slice. Do not display controls that pretend those features work.
- Actual cryptography must be present from the first persisted classroom record. Do not implement a plaintext version to encrypt later.

## Implementation sequence

### 1. Establish the application boundary

Move the current landing layout and its `prerender = true` / `csr = false` options into a marketing route group. Keep the public URLs unchanged. Add a minimal application layout with client interactivity, a language switch, and accessible loading/error states. Keep the public photo assets and display-font preload logic out of the app path where they are not needed.

Server rendering may provide a public shell and session state, but must never decrypt protected classroom data. Scope page options explicitly. Check production CSP against actual app hydration; adapt the integration without broadly allowing inline script execution.

Acceptance: landing pages remain script-free; application interactions run in production; no protected data appears in server-rendered HTML or logs.

### 2. Define and test the access/crypto format

Write a short format note alongside the implementation before persisting records. Use the spec's Teacher Key, Group Key, and per-family Family Key model.

- Generate high-entropy random secrets and keys in the browser using Web Crypto.
- Derive separate authentication and unlock values with HKDF and distinct context labels.
- Encrypt/wrap with AES-GCM and fresh nonces. Authenticate context such as format version, classroom ID, record purpose, and key version to prevent swapping ciphertext between contexts.
- Version serialized encrypted payloads from the beginning. Keep encoding and validation inside a small crypto module.
- Keep QR secrets in URL fragments; never in paths, queries, request bodies, server logs, or analytics. The independently derived authentication token is sent for authentication; its hash is stored.
- Store operational keys in IndexedDB as non-extractable CryptoKey objects where practical. Do not describe this as protection from malicious same-origin scripts.

Do not invent a crypto protocol for message signing or forward secrecy here. Resolve concrete wrapping/recovery requirements against the written spec. Keep temporary raw key material restricted to the wrapping helper.

Acceptance: round-trip decryption succeeds; wrong key, modified ciphertext, and wrong record context fail; auth-token possession alone cannot unwrap content. These are meaningful tests, not tests of component markup.

### 3. Implement authorized first-time setup

Provision local D1 and commit the first migration. Use opaque IDs and parameterized SQL. Persist only records needed for installation setup, classroom crypto, teacher/family credentials, family wrapping relationships, sessions, and one encrypted classroom administration payload.

Initial setup needs explicit authorization: a random installation setup token configured by the self-hoster as a Worker secret, with a local `.dev.vars` equivalent. It authorizes installation initialization, not decryption. Do not expose open “first visitor becomes teacher” registration.

A teacher enters the setup token and classroom details. The browser creates the classroom keys, the first teacher credential, and a separate recovery credential wrapping the same Teacher Key. Only authentication verifiers, opaque structure, and encrypted values reach D1. Store classroom names and the welcome text encrypted.

Complete initialization atomically with a single-use state transition. Concurrent or retried setup requests must not create multiple owners or overwrite initialized keys. Keep generated credentials available on the teacher device until completion is confirmed; failure must not strand an initialized classroom without a usable card.

Acceptance: unauthenticated setup is rejected; only one initialization wins; retry behavior is defined; the database contains no plaintext classroom name or encryption key.

### 4. Deliver teacher onboarding and recovery

After setup, present a print-friendly recovery QR card and a short instruction to store it securely. Confirm that the teacher has saved it before completing the flow. Browser printing is enough; do not add a PDF generation dependency.

The teacher can enroll another device using an authorized teacher card. Clearing local keys and using the independent recovery card must restore access. Missing local keys must lead to “scan your card again,” even if a session cookie still exists. Session presence alone never means the app is ready to decrypt.

Use minimal, maintained QR encoding/decoding libraries only after evaluating them. Native browser scanning may be an optimization, but cannot be the only implementation. Load camera/decoder code only when scanning; support importing a QR image for a card already on the device or a desktop without a camera. Stop camera tracks on exit.

Acceptance: recover on a second browser/device; keyboard and camera-denied flows remain usable; printing never sends secrets to the server.

### 5. Add a family and enroll parents

Teacher enters the child's name and family relationship, creates a Family Key, and issues a family card. Keep the child/family relationship in the encrypted administration record, with version checks for concurrent updates. Prepare the key wrapping relationships exactly as specified; use one family card across devices.

A parent scans/imports the card, authenticates, unwraps Family Key and Group Key locally, and opens a simple encrypted classroom welcome. This welcome is a setup record, not a throwaway messaging system. It proves the teacher-to-family encryption path and gives the parent a useful confirmation: they have joined the correct group.

The parent sees neither a child directory nor cryptographic terminology. Give them a short success screen and the empty classroom feed. Explain that notices are the next feature without fake feed items.

Acceptance: two family devices work independently; the encrypted welcome decrypts; another family's private test payload cannot be opened; revoked/invalid QR cards show a localized actionable error.

### 6. Complete the session lifecycle

Use random session tokens in Secure (on HTTPS), HttpOnly, SameSite cookies; store only token hashes server-side. Protect state-changing routes against cross-site requests and enforce classroom/role authorization on every relevant endpoint. Bound request sizes and rate-limit enrollment attempts without adding a separate service by default.

Implement the spec's access actions:

- Sign out this device: revoke its session and clear local key storage owned by that app session.
- Replace family card: rotate enrollment credentials in place; existing sessions continue.
- Disconnect all family devices and issue a new card: revoke sessions and replace enrollment credentials.
- Revoke a teacher credential: revoke its sessions; another teacher/recovery credential remains usable.
- Honor credential expiry; teacher sessions cannot extend beyond it. Apply sliding session renewal without writing D1 on every request.

Document that revocation stops server access but does not erase retained keys or copies. The separate suspected key-compromise/classroom reset procedure can be documented for this slice; do not build an elaborate admin reset UI.

Acceptance: revoked credentials cannot enroll; revoked sessions cannot fetch key envelopes or classroom data; refresh and browser restart preserve authorized access; a session without local keys triggers recovery; session-only possession does not decrypt content.

## Keep the implementation small

Use route handlers and a few cohesive modules: client crypto, local key storage, server sessions/access, and database operations. Create files when responsibilities require a boundary; do not create a repository/service/controller layer for each table. Server-only helpers belong under `src/lib/server`; browser keys never cross that boundary.

Add one test runner suitable for the implemented behavior, plus focused integration coverage for the D1/session boundary. Choose exact QR/testing dependencies at implementation time and record why they are needed. Keep CI validation-only; add the new behavior tests to its existing job. No remote deployment is required to finish local development.

## Review and acceptance evidence

Return this slice in reviewable checkpoints: app shell + crypto format; authorized setup + recovery; family enrollment + session lifecycle. The owner reviews and commits each checkpoint; agents do not commit automatically.

Before calling the slice complete, demonstrate:

1. Fresh local setup using documented commands and D1 migrations, with no remote account needed.
2. Teacher setup → saved recovery card → family card → another device decrypting the welcome.
3. Family card rotation, device disconnection, teacher credential revocation, and key recovery tests.
4. Automated wrong-key/tampering/context tests and authorization/isolation tests.
5. Production build and CSP verification, plus Croatian/English phone and desktop walkthroughs.
6. A real iPhone and Android check of QR scanning/import and browser storage behavior. Do not require PWA installation for this slice; notification onboarding and the browser-to-installed-app handoff are explicitly verified in the next slice.
7. Inspection of a local D1 export and captured requests showing that test names/content/QR secrets are absent from server persistence and requests, while expected auth tokens and ciphertext are present.

Use synthetic people and content until the access boundary is reviewed. This is a review gate for real data, not a new approval flow for routine development.

## Immediately afterward: encrypted notices with push

Teacher publishes an encrypted notice; a family receives a generic notification and opens the decrypted notice. Add manifest/service-worker installation, notification enrollment and a test notification, session-owned subscriptions, revoke/expiry cleanup, and simple retry handling as part of that complete flow. Keep push prominent and test actual iOS/Android behavior before expanding into photo work.

Suggested commit for this plan: `docs: plan teacher setup and family QR enrollment`.
