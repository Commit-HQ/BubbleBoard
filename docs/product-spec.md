# Kindergarten Communication PWA
## Production Product & Architecture Specification — Operator-Blind Vault

> **Current decisions (2026-09-12).** This specification is the original target. The decisions below replace or settle parts of it; where they differ, follow them. The [README](../README.md) tracks what is implemented, and the [architecture notes](architecture.md) hold the conventions.
>
> - **One installation per kindergarten** (replaces the SaaS model in §48). BubbleBoard is free, open-source software, not a hosted service with sign-ups. Each kindergarten runs its own installation of the same code on its own Cloudflare account, and the public landing page is identical on every installation.
> - **Kindergarten-wide access** (replaces the Teacher Key for each classroom in §2, §5–6, §9–14, §17, and §49–51). An installation has any number of classrooms and one catalog of children and families. Every staff card opens one Staff Key; admins manage classrooms, teachers, and the catalog, and teachers work in their assigned classrooms, which the server enforces. A family card opens every classroom the family's children are in. The [access format](access-format.md) records the keys and the security trade-off, and the [next step plan](next-step-plan.md) the product decisions.
> - **Language URLs** (not covered by this specification). Croatian is served at `/` and English at `/en`, without a language cookie. App routes and QR links (§33) must fit this scheme.
> - **Build order** (replaces the pilot steps in §60). Follow the README's “Next slices”: teacher setup and family enrollment; an encrypted notice with push notifications; privacy-aware photos; then private messages and attachments.
> - **Notices** (extends §6, §34, §39–40, and §53): a notice can go to several classrooms, encrypted once with its own Notice Key, which each classroom's Group Key opens. Pushes carry no content. On phones and tablets, BubbleBoard works only once installed, and computers use the browser; notifications are turned on from home. The [next step plan](next-step-plan.md) records the decisions.
> - **Seen marks** (extends §44, 2026-09-13): families mark notices as seen with a tap, and the server stores which family marked which notice, so teachers know who saw it. The [next step plan](next-step-plan.md) records the decision.
> - **Media retention** (§42) is decided as written: 1, 3, 7, 14, 30, 60, or 90 days, with 30 days as the default for classroom photos and notices.
> - **Deployment** (§46–47) is not automated yet. CI only validates; automated deploys, build manifests, and post-deploy verification come with deployment work, opt-in for each installation.

# 1. Product Goal

Build a simple communication application for kindergartens that works on mobile and desktop while ensuring that the application operator cannot read sensitive child data merely because it hosts the system.

The central security goal is:

> **Operator privileges alone do not provide access to plaintext children's photos, names, private family communication, or consent settings.**

If the operator is also a legitimate parent or teacher in a classroom, that person may of course see the same content as any other authorized member of that classroom.

The central product goal is:

> **Parents and teachers should not need to understand accounts, passwords, cryptography, recovery phrases, or key management.**

The architecture deliberately prefers simple, understandable security over complex key hierarchies.

If a rare catastrophic reset requires re-entering a classroom roster and handing out new QR cards, that is acceptable.

---

# 2. Core Product Principles

1. **A family is the parent-side access unit.**
2. **The same Family QR may be used on multiple family devices.**
3. **Each teacher may have their own Teacher QR credential.**
4. **All teacher credentials for one classroom unlock the same Teacher Key.**
5. **The operator/server never receives plaintext Teacher Keys, Group Keys, Family Keys, child names, consent settings, private messages, or readable photos.**
6. **Shared classroom content uses one Group Key.**
7. **Private family content uses one Family Key per family.**
8. **The Teacher Key can unlock the Group Key and all Family Keys for that classroom.**
9. **A child may belong to more than one family.**
10. **A parent may hide their child's face from other families while still seeing their own child unblurred.**
11. **The original unprocessed classroom photo is never uploaded.**
12. **Media expires automatically.**
13. **Metadata that directly links privacy choices to identifiable families should not be stored.**
14. **Harmless aggregate structure does not need to be hidden if hiding it would materially complicate the product.**
15. **The implementation should remain small enough to audit and explain.**

---

# 3. Product Scope

The product focuses on:

- classroom notices,
- classroom photos,
- family-private messages,
- family-private documents,
- classroom roster,
- photo consent,
- push notifications,
- family onboarding,
- teacher onboarding,
- short-lived encrypted media.

The product does not try to become a full kindergarten ERP.

Out of scope unless later required:

- billing,
- payroll,
- advanced attendance,
- medical records,
- staff scheduling,
- accounting,
- video calling,
- large chat systems,
- public social feeds,
- child-development tracking,
- native mobile apps,
- native desktop apps.

---

# 4. Application Model

## 4.1 One SvelteKit Application

The product is one full-stack SvelteKit application.

The same codebase serves:

- parent UI,
- teacher UI,
- admin/setup UI,
- backend API routes,
- PWA installation,
- desktop browser usage,
- mobile PWA usage.

Recommended stack:

```text
Language             TypeScript
Framework            SvelteKit
Hosting / Compute    Cloudflare Workers
Database             Cloudflare D1
Object Storage       Cloudflare R2
Photo Editing        Fabric.js
Cryptography         Web Crypto API
Local Key Storage    IndexedDB
Notifications        Web Push + VAPID
App Model            Responsive PWA
```

No separate backend service is required.

## 4.2 Supported Platforms

The same application should work on:

- desktop browser,
- installable desktop PWA where supported,
- iPhone/iPad Home Screen PWA,
- Android browser/PWA.

A separate Electron, Tauri, Capacitor, native iOS, or native Android app is not required unless a future product need justifies it.

---

# 5. Classroom Model

A classroom contains:

```text
Classroom
├── Teachers
├── Children
├── Families
├── Notices
├── Photos
├── Documents
└── Consent Settings
```

The cryptographic model intentionally has only three key types:

```text
Teacher Key
Group Key
Family Key
```

There is:

- one Teacher Key per classroom,
- one Group Key per classroom,
- one Family Key per family.

There may be multiple Teacher QR credentials that all unlock the same Teacher Key.

A child may be linked to one or more families.

---

# 6. Simplified Key Model

## 6.1 Teacher Key

The Teacher Key is the classroom's administrative secret.

It can unlock:

- the Group Key,
- every Family Key,
- encrypted consent settings.

Conceptually:

```text
Teacher Key
   │
   ├── unwraps Group Key
   ├── unwraps Family Key A
   ├── unwraps Family Key B
   ├── unwraps Family Key C
   └── decrypts consent configuration
```

The server never receives the plaintext Teacher Key.

## 6.2 Group Key

The Group Key protects data that every authorized family in the classroom may access.

Examples:

- classroom notices,
- classroom roster,
- child names visible within the classroom,
- shared documents,
- blurred classroom photo base images.

Conceptually:

```text
Group Key
   │
   ├── notices
   ├── roster
   ├── shared documents
   └── classroom-safe photo base
```

## 6.3 Family Key

Each family has one Family Key.

It protects:

- family-private messages,
- family-private documents,
- private reveal data for that family's child or children.

Example:

```text
Family Key A
   │
   ├── private messages
   ├── private documents
   └── reveal data for Family A
```

---

# 7. Family QR

## 7.1 Purpose

Parents onboard by scanning one QR code.

No:

- username,
- password,
- email verification,
- SMS,
- password reset,
- separate mother/father/grandparent accounts.

The same Family QR may be scanned on multiple devices.

## 7.2 Family Secret

The Family QR contains a high-entropy random secret:

```text
Family Secret
```

The application derives two independent values from it:

```text
Family Secret
      │
      ├── Family Unlock Key
      └── Family Auth Token
```

Use a standard KDF such as HKDF with separate context strings.

Example:

```text
"family-key-wrap"
"family-auth"
```

The server stores:

```text
encrypted_family_key
hash(family_auth_token)
```

The server does not store:

```text
Family Secret
Family Unlock Key
Family Key
```

## 7.3 Family Access Flow

```text
Scan Family QR
      ↓
read Family Secret
      ↓
derive Auth Token + Unlock Key
      ↓
authenticate using token
      ↓
download encrypted Family Key
      ↓
decrypt Family Key locally
      ↓
download wrapped Group Key
      ↓
unwrap Group Key using Family Key
      ↓
ready
```

---

# 8. Family QR Re-Issue and Reset

Two different operations are required.

## 8.1 Rotate Family QR

Use when:

- a printed QR is lost,
- a screenshot was shared,
- a new QR should replace the old enrollment credential.

Rotation updates the **existing FamilyCredential in place**.

Behavior:

```text
generate new Family Secret
      ↓
derive new Family Auth Token + Family Unlock Key
      ↓
wrap the existing Family Key using the new unlock key
      ↓
update the same FamilyCredential:
    same id
    new auth_token_hash
    new encrypted_family_key
    rotated_at = now
      ↓
issue new Family QR
```

The old QR stops authenticating because its derived auth token no longer matches `auth_token_hash`.

Existing authorized device sessions remain active.

The Family Key does not change.

Historical encrypted content does not need to be re-encrypted.

`revoked_at` is **not** set during rotation.

It is reserved for explicit credential revocation / family-access removal.

```text
Rotate Family QR
→ replace enrollment secret only
→ existing authorized sessions remain valid

Revoke FamilyCredential
→ credential becomes invalid
→ revoke all sessions created by that credential
```

## 8.2 Reset Family Access

Use when there is concern that an unauthorized device may already have been enrolled.

Behavior:

```text
revoke existing family sessions
      ↓
rotate Family QR
      ↓
require authorized family devices to scan again
```

The Family Key may remain the same unless there is a concrete reason to rotate it.

---

# 9. Teacher Credentials

The classroom has one Teacher Key but may have multiple independent teacher credentials.

Example:

```text
Teacher Key
   │
   ├── wrapped for Teacher QR A
   ├── wrapped for Teacher QR B
   ├── wrapped for Substitute QR
   └── wrapped for Printed Recovery QR
```

Each Teacher QR has:

- its own Teacher Secret,
- its own Teacher Auth Token,
- its own encrypted wrapping of the same Teacher Key.

This allows:

- one teacher to leave without affecting others,
- a substitute teacher to receive temporary access,
- credentials to be revoked individually,
- a printed recovery QR to exist independently from everyday teacher QR codes.

---

# 10. Teacher QR

Each Teacher QR contains a high-entropy:

```text
Teacher Secret
```

From it the application derives:

```text
Teacher Secret
      │
      ├── Teacher Unlock Key
      └── Teacher Auth Token
```

The server stores:

```text
encrypted_teacher_key_for_credential
hash(teacher_auth_token)
```

The server does not store the plaintext Teacher Secret or Teacher Key.

---

# 11. Teacher Recovery

A printed Teacher QR credential should be stored securely in the kindergarten as a cold backup.

If a teacher loses a phone or clears browser storage:

```text
Open app on new device
      ↓
Scan authorized Teacher QR
      ↓
Teacher Key restored
      ↓
classroom access restored
```

No separate root recovery hierarchy is required.

The recovery credential is simply another TeacherCredential that wraps the same Teacher Key.

---

# 12. Catastrophic Reset Policy

The product accepts one rare worst-case failure:

- every authorized teacher device is lost,
- every Teacher QR credential is lost,
- no authorized teacher can recover the Teacher Key.

In that case:

```text
Reset classroom crypto
      ↓
generate new Teacher Key
      ↓
generate new Group Key
      ↓
generate new Family Keys
      ↓
re-enter roster
      ↓
issue new Teacher QR credentials
      ↓
issue new Family QR cards
```

Because media is short-lived, losing access to old encrypted content is considered acceptable.

---

# 13. Group Key Distribution

Each Family Key can unlock the Group Key.

The server stores one wrapped Group Key per family.

Conceptually:

```text
Group Key
   │
   ├── wrapped with Family Key A
   ├── wrapped with Family Key B
   ├── wrapped with Family Key C
   └── wrapped with Teacher Key
```

A parent gets the Group Key through the Family Key.

A teacher gets it through the Teacher Key.

---

# 14. Family Keys Available to Teachers

Every Family Key must also be wrapped for the Teacher Key.

Conceptually:

```text
Family Key A
   ├── wrapped for Family QR credential
   └── wrapped for Teacher Key
```

This enables teachers to:

- read family-private messages,
- send family-private messages,
- process reveal content,
- perform QR re-issue without changing the Family Key.

The server stores only the wrapped form.

---

# 15. Key Re-Wrapping

The implementation should avoid unnecessary complexity around Web Crypto `wrapKey()` semantics.

Recommended approach:

- use standard AES-GCM for encrypting small raw symmetric key material,
- decrypt raw key bytes only inside a small crypto helper when re-wrapping is required,
- immediately import operational keys as `CryptoKey` objects,
- use `extractable: false` for normal stored keys wherever practical,
- discard temporary raw key bytes as soon as possible.

This keeps key handling explicit and auditable without introducing additional key hierarchies.

---

# 16. Opaque IDs

Server-side identifiers should be random and meaningless.

Use opaque identifiers such as UUIDs/random IDs.

Do not encode:

- child names,
- family names,
- alphabetical position,
- classroom roster order,
- consent state.

Avoid sequential IDs that may reveal creation order when that order could help correlate identities.

Opaque IDs are privacy hygiene, not a substitute for encryption.

---

# 17. Child and Family Relationship

A child may belong to one or more families.

Examples:

```text
Child Luka
├── Family A
└── Family B
```

This supports situations such as:

- separated parents,
- shared custody,
- guardians living separately.

Each Family has its own Family Key and Family QR.

The server must not store the child ↔ family relationship in plaintext.

The mapping belongs inside the Teacher-Key-encrypted classroom administration block:

```text
EncryptedClassroomAdmin
{
    children
    child_family_links
    consent_settings
}
```

Only an authorized teacher client decrypts this mapping.

If the child is `FAMILY_ONLY`, the teacher client uses this encrypted relationship data to create reveal entries for every authorized family linked to that child.

---

# 18. Photo Consent Model

The product needs only two face-visibility states.

## `CLASSROOM_VISIBLE`

```text
Own family:       visible
Other families:   visible
```

## `FAMILY_ONLY`

```text
Own family:       visible
Other families:   blurred
```

Parent-facing wording:

> **Who may see my child's face in classroom photos?**

Options:

```text
○ Our family only
○ Families in our classroom
```

---

# 19. Consent Authority

The teacher/kindergarten is the authoritative editor of stored consent state.

This keeps the cryptographic model simple.

Typical flow:

```text
parent gives or revokes consent
      ↓
teacher records the choice
      ↓
teacher client encrypts consent state using Teacher Key
      ↓
server stores ciphertext
```

Consent may originate from:

- a paper form,
- an in-person request,
- a private family message.

If parents later request consent changes directly in the app, the request should travel through the Family Key protected channel and be applied by the teacher client.

The system does not require a separate signed-consent cryptographic protocol.

---

# 20. Photo Processing

The original photo remains local to the teacher device.

Workflow:

```text
Original Photo
      ↓
teacher tags children
      ↓
load encrypted consent settings
      ↓
evaluate face visibility
      ↓
extract private reveal data
      ↓
blur FAMILY_ONLY children
      ↓
create classroom-safe base
      ↓
encrypt processed assets
      ↓
upload encrypted data only
```

The full unsafe original is never uploaded.

---

# 21. Classroom-Safe Base Image

Every classroom photo produces one shared base image.

Example:

```text
Ana     CLASSROOM_VISIBLE
Luka    FAMILY_ONLY
Marko   CLASSROOM_VISIBLE
Petra   FAMILY_ONLY
```

Classroom base:

```text
Ana      visible
Luka     blurred
Marko    visible
Petra    blurred
```

The base image is encrypted directly using the Group Key with AES-GCM and a fresh random nonce for every object.

A separate per-object Content Key is not required.

---

# 22. Reveal Data

Parents should still see their own child unblurred.

Before blurring the base image, the teacher client extracts a small reveal patch for each `FAMILY_ONLY` child.

If a child belongs to more than one family, the same reveal patch can appear as separate encrypted entries, one for each linked Family Key.

---

# 23. Reveal Package

Reveal patches for one photo are stored in one common package.

Do not use family-specific URLs such as:

```text
/photo/123/reveal/family-a
/photo/123/reveal/family-b
```

Instead:

```text
/photo/123/reveals.enc
```

Every authorized family downloads the same reveal package.

The package contains opaque encrypted entries.

Each client attempts to decrypt entries using its Family Key.

Successful authenticated decryption means:

```text
this reveal belongs to me
```

Failed decryption means:

```text
not mine
```

For a normal classroom size, this is inexpensive and simple.

---

# 24. Reveal Metadata Privacy

The server should not store plaintext mappings such as:

```text
family_id → reveal entry
child_id → reveal entry
consent state → family
```

The server may still be able to infer harmless aggregate facts such as:

- approximate reveal package size,
- approximate number of encrypted reveal entries.

That is acceptable.

The product intentionally does not add:

- dummy entries,
- fixed-size family slots,
- padding solely to hide aggregate structure.

The important privacy boundary is:

> **The operator should not be able to link a reveal entry or a privacy choice to an identifiable family or child.**

---

# 25. Reveal Patch Format

Recommended reveal format:

- WebP,
- alpha transparency,
- small padded crop,
- soft/feathered edges.

The patch should composite naturally over the blurred base image.

Avoid hard rectangular seams.

---

# 26. Parent Photo Rendering

When a parent opens a photo:

```text
download encrypted base
      ↓
decrypt using Group Key
      ↓
download common reveal package
      ↓
try reveal entries using Family Key
      ↓
if a matching reveal exists:
    decrypt it
    composite locally
      ↓
display final image
```

The family sees:

- its own restricted child unblurred,
- other restricted children blurred.

---

# 27. Save to Device

When a parent saves a photo:

```text
decrypt base
      ↓
apply own reveal
      ↓
save locally rendered result
```

The server never generates a personalized full-resolution photo.

---

# 28. Consent Settings

Consent configuration is encrypted using the Teacher Key.

The operator should not be able to determine which children are:

```text
CLASSROOM_VISIBLE
FAMILY_ONLY
```

Teachers decrypt consent locally before photo processing.

Authorized parents may still infer visible/blurred state from photos they are legitimately allowed to view.

---

# 29. Classroom Roster

The classroom roster is encrypted using the Group Key.

Authorized classroom families can decrypt it.

The operator cannot decrypt it using server privileges alone.

The server may store opaque identifiers for routing, but not plaintext child names.

---

# 30. Private Family Communication

Messages between teachers and one family are encrypted using that family's Family Key.

Both directions use the same family cryptographic context.

The server stores ciphertext only.

An operator who is also a legitimate parent in the classroom still cannot decrypt another family's private messages unless separately authorized as a teacher.

---

# 31. Authentication

The server authenticates possession of:

- Family Auth Token,
- or Teacher Auth Token.

The server stores only a hash/verifier of the token.

The auth token is derived independently from the encryption unlock key using domain-separated derivation.

---

# 32. Device Sessions

Once a QR has enrolled a device, the server may issue a random session credential for that installation.

Each session is linked to the credential that created it:

```text
Session
{
    id
    credential_id
    token_hash
    last_activity_at
    expires_at
    revoked_at?
}
```

The session credential:

- authorizes API access,
- is not an encryption key,
- may be revoked independently,
- avoids requiring the QR secret for every request.

## 32.1 Family Session Lifetime

Normal family-device sessions use **sliding expiration**.

Recommended V1 policy:

```text
session expires_at
= 90 days after last meaningful authenticated activity
```

When an authorized family device uses the application, the server may extend that session's `expires_at` to:

```text
now + 90 days
```

The purpose is to let actively used family devices remain signed in indefinitely without requiring parents to repeatedly scan the Family QR.

Inactive devices eventually expire automatically.

A Family QR rotation does not affect already established sessions.

Therefore this remains valid:

```text
Family QR rotated
      ↓
old QR no longer enrolls devices
      ↓
existing active family sessions continue
      ↓
each session continues using sliding expiration
```

If a family session finally expires after long inactivity, the device must enroll again using the **currently valid** Family QR.

The exact activity threshold used to refresh `expires_at` should avoid unnecessary database writes. For example, the server may refresh only when the remaining session lifetime falls below a chosen threshold rather than on every request.

## 32.2 Teacher Session Lifetime

Ordinary teacher sessions may use the same sliding-session approach.

However, a teacher session must never outlive the TeacherCredential that created it.

For temporary/substitute credentials:

```text
session.expires_at <= teacher_credential.expires_at
```

Even if the teacher actively uses the application, sliding renewal cannot extend the session past the credential's fixed expiry.

Rules:

```text
Rotate Family QR in place
→ same credential id
→ auth_token_hash / encrypted_family_key change
→ existing sessions remain valid

Revoke credential
→ set revoked_at
→ revoke all sessions created by that credential

Reset Family Access
→ revoke all relevant family sessions
→ rotate the Family QR enrollment secret

Expired credential
→ no session may remain valid beyond credential expiry

Expired session
→ API access denied
→ associated PushSubscription removed/disabled
```

Normal family sessions use sliding 90-day expiration from recent activity.

Temporary/substitute Teacher credentials should use `expires_at`, and their sessions must not outlive the credential.

This keeps QR rotation and device revocation simple without introducing per-device encryption keys.

---

# 33. QR Secrets in URLs

If a QR is represented as a URL, the secret must be placed in the URL fragment:

```text
https://app.example/#family=<secret>
```

not in:

- path,
- query string,
- server-visible parameters.

The browser fragment is processed client-side and is not sent as part of the normal HTTP request.

The application should remove the fragment from visible history/state after successful processing where practical.

---

# 34. iOS QR Scanning

The preferred onboarding flow is to scan the QR from inside the installed PWA.

Reason:

- scanning with the iPhone Camera app may open Safari,
- Safari and the installed PWA have separate application storage.

Therefore:

```text
Install PWA
      ↓
open installed app
      ↓
tap "Scan QR"
      ↓
scan Family or Teacher QR
```

If a QR is opened directly in Safari, the page should not silently complete enrollment into Safari-only storage.

Instead it should clearly instruct the user to:

```text
Open/install the Kindergarten app
→ choose Scan QR
→ scan the code inside the app
```

---

# 35. Local Key Storage

Sensitive cryptographic keys should be stored in IndexedDB as `CryptoKey` objects where supported.

Rules:

- use Web Crypto API,
- use `extractable: false` wherever practical,
- no plaintext key strings in `localStorage`,
- avoid manual base64 key storage unless technically unavoidable,
- keep temporary key material in memory only as long as necessary.

---

# 36. XSS Is a Critical Security Boundary

Because decryption happens in the browser, malicious JavaScript executing in the application origin may use live keys or observe plaintext.

Therefore:

- XSS is a critical vulnerability,
- third-party runtime JavaScript should be minimized,
- user HTML should never be rendered unsafely,
- Svelte `{@html}` should not be used for user-controlled content unless rigorously sanitized.

Non-extractable `CryptoKey` objects reduce accidental export but do not make XSS harmless.

---

# 37. Content Security Policy

Production should aim for:

```text
no 'unsafe-eval'
avoid 'unsafe-inline'
```

For the prerendered/static application shell, prefer SvelteKit's hash-based CSP mode:

```js
kit: {
    csp: {
        mode: 'hash'
    }
}
```

This keeps the generated app-shell HTML deterministic and makes it practical to verify deployed HTML against CI output.

Nonce-based CSP may still be used for genuinely dynamic responses if a concrete implementation need requires it, but V1 should prefer hash mode for the stable application shell.

Recommended principles:

- scripts served from the application origin,
- no arbitrary external JS CDNs,
- no tag-manager script injection,
- no `eval`,
- no `new Function`,
- restrictive `connect-src`,
- `object-src 'none'`,
- restrictive `frame-ancestors`.

Security testing must use the actual production build.

---

# 38. Third-Party JavaScript

Avoid runtime integrations such as:

- Google Tag Manager,
- Hotjar,
- session replay,
- advertising scripts,
- Intercom-style chat widgets,
- arbitrary analytics SDKs.

If analytics are required, prefer coarse first-party or server-side aggregate metrics.

---

# 39. Push Notifications

Push notification text should remain generic.

Recommended:

```text
Nova obavijest iz vrtića
```

or:

```text
Novi sadržaj u aplikaciji
```

Avoid sensitive content in lock-screen notifications.

## 39.1 Push Subscription Ownership

Every push subscription must belong to the authenticated session that created it.

Conceptual record:

```text
PushSubscription
{
    id
    session_id
    endpoint
    p256dh
    auth
    created_at
}
```

The server should send push notifications only through subscriptions whose owning session is currently valid and authorized.

## 39.2 Push Subscription Revocation

When a session is:

- revoked,
- expired,
- invalidated by credential revocation,
- or otherwise removed,

all `PushSubscription` records associated with that `session_id` must also be deleted or disabled.

Conceptually:

```text
revoke / expire Session
        ↓
disable API access
        ↓
delete PushSubscription where session_id = ?
        ↓
device receives no further kindergarten push
```

This prevents:

- removed families,
- revoked devices,
- former teachers,
- expired substitute teachers

from continuing to receive even generic kindergarten notifications.

Push delivery should therefore always be derived from **currently valid sessions**, not merely from historical family or teacher membership.

Do not create complicated traffic-obfuscation logic unless a concrete privacy review requires it.

---

# 40. iOS PWA Onboarding

Required flow:

```text
Open in Safari
      ↓
Add to Home Screen
      ↓
open installed app
      ↓
Enable Notifications
      ↓
tap Scan QR
      ↓
scan Family QR
      ↓
Done
```

Use visual instructions or short animations.

Do not assume users know how to install a PWA.

---

# 41. Desktop Experience

The application should work fully in a normal desktop browser.

Teachers may prefer desktop for:

- photo tagging,
- family management,
- notices,
- documents.

No separate desktop codebase is required.

---

# 42. Media Retention

Every media object must have a retention period.

Recommended options:

```text
1 day
3 days
7 days
14 days
30 days
60 days
90 days
```

Default classroom photos may use 30 days.

Short-lived content is a deliberate part of the security model.

---

# 43. R2 Storage

Recommended retention prefixes:

```text
/media/1d/
/media/3d/
/media/7d/
/media/14d/
/media/30d/
/media/60d/
/media/90d/
```

Example:

```text
/media/30d/classroom-x/photo-y/base.enc
/media/30d/classroom-x/photo-y/reveals.enc
```

No unencrypted original photo should exist in R2.

## 43.1 Private R2 Access Only

The R2 media bucket must remain private.

Do not expose protected media through:

- a public bucket,
- an enabled `r2.dev` public endpoint,
- a public custom-domain R2 URL,
- or an unauthenticated CDN path.

All application media reads must go through an authenticated Cloudflare Worker / SvelteKit server route.

Conceptually:

```text
client requests media
      ↓
Worker verifies session
      ↓
Worker verifies current classroom/family authorization
      ↓
Worker verifies content still exists and is not expired/deleted
      ↓
R2.get(...)
      ↓
return encrypted bytes
```

Knowing an object key or historical URL must never be sufficient to download the object.

This authorization boundary is still necessary for encrypted media because a removed family may retain an old Group Key or Family Key.

## 43.2 Protected Media Cache Policy

V1 should not place authenticated encrypted-media responses into a shared public CDN cache.

Recommended default:

```http
Cache-Control: private, no-store
```

This prevents a deleted or access-revoked object from continuing to be served from a shared cache after authoritative application state changes.

If controlled encrypted-media caching is introduced later, authorization and cache invalidation must be designed explicitly before enabling it.

## 43.3 Client Cache Reconciliation

The PWA may cache application data for usability, but application-controlled caches must reconcile against authoritative server state.

During synchronization, remove cached content that is:

- deleted,
- expired,
- no longer authorized,
- or no longer present in the active content index.

This applies to:

- Cache Storage / Service Worker caches,
- IndexedDB content caches,
- in-memory content indexes.

A deleted publication must not remain visible merely because an older local response still exists.

This does not and cannot recall a file that a user intentionally saved outside the application.

---

# 44. Operator Metadata Minimization

The operator should not intentionally store:

- plaintext child names,
- plaintext family names unless operationally unavoidable,
- consent choices,
- family-specific reveal URLs,
- private message text,
- readable documents,
- readable photos.

Opaque IDs are acceptable for routing.

The goal is not to hide every aggregate fact.

The goal is to prevent server/operator privileges from revealing sensitive identity relationships and content.

---

# 45. Logging

Application-level logging should be minimized.

Where possible:

```text
Workers invocation logs     OFF
R2 access logs              OFF
Logpush                     OFF
third-party analytics       NONE
session replay              NONE
```

Do not claim that no infrastructure provider can ever observe an IP address.

The appropriate claim is:

> **The application operator does not intentionally persist parent browsing or content-access logs beyond what is operationally necessary.**

---

# 46. Open Source Client

The client implementation should be public.

Recommended flow:

```text
public Git repository
      ↓
protected main branch
      ↓
automated CI build
      ↓
automated Cloudflare deploy
```

Production deployment credentials should preferably be available to CI rather than used manually in ordinary development workflows.

---

# 47. Build Transparency

The application should expose:

```text
Version
Commit SHA
Build hash
```

Example:

```text
Version: 1.0.4
Commit: a34f91c
Build: sha256:f83a...
```

The CI pipeline should publish the same build metadata.

The in-app build hash is a transparency/debugging signal, not proof by itself.

## 47.1 Pre-Deploy Build Integrity Verification

CI must verify the actual production build output before deployment, not only source code.

The verification set should include at minimum:

- prerendered/static HTML app shell,
- JavaScript bundles,
- CSS assets,
- application manifest,
- Service Worker,
- expected production CSP configuration/header.

Recommended flow:

```text
protected source commit
      ↓
production SvelteKit build
      ↓
verify CSP policy
      ↓
verify forbidden constructs/settings are absent
      ↓
hash HTML + JS + CSS + manifest + Service Worker
      ↓
publish build manifest
      ↓
deploy exactly that verified output
```

Hash-based CSP for the prerendered shell is preferred because the HTML is deterministic and can be included in this comparison.

The pre-deploy check must verify that production does not unexpectedly introduce `unsafe-eval`, unauthorized inline script execution, or a weakened CSP.

## 47.2 Public Post-Deploy Production Verification

A lightweight public CI job should periodically verify that **what production is actually serving** matches the most recently published CI build manifest.

This check is intentionally separate from pre-deploy verification because it can detect:

- manual production changes,
- a deploy performed outside CI,
- a modified Service Worker,
- modified app-shell HTML,
- or a changed/weakened CSP header.

Example:

```text
scheduled GitHub Action
      ↓
fetch production app-shell HTML
      ↓
fetch production JS/CSS/assets
      ↓
fetch Service Worker
      ↓
read production CSP header
      ↓
hash/compare with latest public CI build manifest
      ↓
pass / publicly fail
```

Both checks are required:

```text
PRE-DEPLOY
→ verifies what CI intends to ship

POST-DEPLOY
→ verifies what users are actually receiving
```

This is not a mathematical guarantee, but it makes silent manual production changes visible at low operational cost.

Do not add more elaborate build-provenance infrastructure unless a real audit or customer requirement justifies it.

---

# 48. Deployment Trust Model

> **Superseded in part:** there is no SaaS product; each kindergarten runs its own installation. See *Current decisions* at the top.

Client-side encryption cannot completely remove trust in the application operator because the operator controls the JavaScript delivered to browsers.

The product addresses this through transparency and deployment discipline:

- public source code,
- protected main branch,
- automated production deployment,
- minimal manual production access,
- visible commit SHA,
- visible build hash,
- minimal third-party JavaScript.

A customer-owned Cloudflare account is not required for the normal SaaS product.

If a future customer requires customer-controlled deployment, that may be offered separately.

The correct claim is:

> **The deployed architecture does not give server-side application privileges the keys required to decrypt stored content, and the client implementation is publicly auditable.**

---

# 49. Server-Side Data Model

The server should only keep what is needed for:

- routing,
- authentication,
- storage,
- encrypted key distribution,
- push delivery,
- retention.

Conceptual entities:

```text
Classroom
Family
TeacherCredential
FamilyCredential
ClassroomCrypto
EncryptedClassroomAdmin
EncryptedRoster
Content
Session
PushSubscription
```

`PushSubscription` belongs to one `Session`.

A push subscription must not exist independently of a valid session lifecycle.

`EncryptedClassroomAdmin` is encrypted with the Teacher Key and contains data the server should not understand:

```text
children
child_family_links
consent_settings
```

The server therefore does not need plaintext `Child` or `ChildFamily` records.

Because `EncryptedClassroomAdmin` is one encrypted aggregate blob, it must use optimistic concurrency control so one teacher cannot silently overwrite another teacher's update.

Recommended record shape:

```text
EncryptedClassroomAdmin
{
    classroom_id
    encrypted_payload
    version
    updated_at
}
```

A write must include the version originally read by the client.

Conceptually:

```sql
UPDATE encrypted_classroom_admin
SET encrypted_payload = ?,
    version = version + 1,
    updated_at = ?
WHERE classroom_id = ?
  AND version = ?;
```

If zero rows are updated, the write conflicts with a newer version.

The teacher client must then:

1. fetch the latest encrypted blob,
2. decrypt it locally,
3. re-apply the intended change,
4. encrypt the merged result,
5. retry using the new version.

The application must never silently overwrite a newer encrypted administration blob.

This is particularly important for consent updates: losing a concurrent consent change could incorrectly make a child visible in future photos.

Exact schema should remain as simple as practical.

---

# 50. Example Key Records

```text
TeacherCredential
{
    id
    classroom_id
    auth_token_hash
    encrypted_teacher_key
    expires_at?
    revoked_at?
}
```

```text
Family
{
    id
    classroom_id
    family_key_wrapped_for_teacher
    group_key_wrapped_for_family
}
```

```text
FamilyCredential
{
    id
    family_id
    auth_token_hash
    encrypted_family_key
    rotated_at?
    expires_at?
    revoked_at?
}
```

```text
ClassroomCrypto
{
    classroom_id
    group_key_wrapped_for_teacher
}
```

```text
PushSubscription
{
    id
    session_id
    endpoint
    p256dh
    auth
    created_at
}
```

The wrapped key relationships belong to the `Family`, not to a specific QR credential. Rotating a Family QR therefore changes only credential data.

Push subscriptions belong to sessions, so revoking or expiring a session also removes/disables its push subscriptions.

---

# 51. Normal Operational Flows

## 51.1 Add Family

```text
create Family
      ↓
generate Family Key
      ↓
wrap Family Key for Teacher Key
      ↓
generate Family Secret
      ↓
wrap Family Key for Family Unlock Key
      ↓
wrap Group Key for Family Key
      ↓
issue Family QR
```

## 51.2 Re-Issue / Rotate Family QR

```text
new Family Secret
      ↓
same Family Key
      ↓
new auth_token_hash
      ↓
new encrypted_family_key
      ↓
UPDATE existing FamilyCredential in place
      ↓
same credential id
revoked_at remains NULL
      ↓
new QR issued
```

Existing authorized device sessions remain active.

The old QR can no longer authenticate because its token no longer matches the credential's current `auth_token_hash`.

## 51.3 Reset Family Access

```text
revoke family sessions
      ↓
rotate Family QR
      ↓
authorized devices scan again
```

## 51.4 Add Teacher

```text
generate new Teacher Secret
      ↓
wrap existing Teacher Key for new credential
      ↓
optionally set expires_at for temporary/substitute access
      ↓
issue Teacher QR
```

Temporary credentials and their sessions expire automatically.

## 51.5 Remove Teacher

```text
revoke TeacherCredential
      ↓
revoke all sessions created by that credential
      ↓
delete/disable PushSubscriptions for those sessions
```

Other teachers remain unaffected.

## 51.6 Remove Family

```text
revoke FamilyCredential
revoke family sessions
delete/disable PushSubscriptions for those sessions
remove active classroom membership
```

Previously saved local media cannot be recalled.

## 51.7 Family Session Renewal

Normal family sessions renew silently during active use.

Conceptually:

```text
authorized family request
      ↓
session valid
      ↓
if renewal threshold reached:
    last_activity_at = now
    expires_at = now + 90 days
      ↓
continue normally
```

No QR scan is required for regularly active family devices.

## 51.8 New Pedagogical Year

Create a new classroom.

Do not attempt to reuse the old classroom cryptographic state unless there is a concrete product reason to do so.

This keeps yearly transitions simple and clean.

---

# 52. Delete Publication

Teachers must be able to immediately remove published content.

This is especially important for photos because mistakes may include:

- a missed face,
- an incorrectly tagged child,
- an outdated consent state,
- an accidentally uploaded document,
- or content published to the wrong audience.

Deleting a publication should immediately:

```text
Teacher presses Delete
      ↓
mark/remove publication from authoritative active-content state
      ↓
delete encrypted R2 objects
      ↓
delete/remove D1 content record or retain only the minimal deletion marker needed for sync
      ↓
Worker refuses any further media fetch
      ↓
clients remove the publication from application-controlled caches on sync
      ↓
content disappears from application
```

For a classroom photo this includes:

```text
base.enc
reveals.enc
```

The application should not wait for the normal retention lifecycle when a teacher explicitly deletes content.

Previously downloaded or locally saved copies on parent devices cannot be recalled.

## 52.1 Delete Synchronization

Deletion must be reflected in both server authorization and application-controlled client caches.

After a publication is deleted:

- the authenticated Worker must stop serving its R2 object immediately,
- the item must disappear from the server's active content index,
- clients must remove stale cached copies during the next synchronization,
- the Service Worker must not continue serving an older cached response.

A lightweight tombstone/versioned content index may be used if needed to make cache reconciliation reliable, but it must not reintroduce sensitive plaintext metadata.

## 52.2 Mandatory Photo Preview

Before publishing a photo, the teacher must see the exact classroom-safe base image that other families will receive.

Flow:

```text
Tag children
      ↓
Apply consent
      ↓
Generate blurred base + reveal package
      ↓
PREVIEW classroom-safe base
      ↓
Confirm Publish
```

If the preview is wrong, the teacher can return to editing before anything is uploaded.

This reduces the risk of manual tagging mistakes without requiring automatic face detection.

---

# 53. Teacher UX

Suggested navigation:

```text
Home
Classroom
Notices
Photos
Families
Documents
Settings
```

## Add Family

```text
Add Child
→ link family/families
→ set consent
→ save
→ show Family QR
```

## Publish Notice

```text
New Notice
→ write
→ choose retention
→ publish
```

## Publish Photo

```text
Add Photo
→ tag children
→ consent check
→ generate blurred base + reveal package
→ preview
→ choose retention
→ publish
```

## Add Teacher

```text
Teachers
→ Add Teacher
→ Generate QR
```

## Recover Teacher Access

```text
Open app
→ Scan Teacher QR
→ Done
```

---

# 54. Parent UX

Suggested navigation:

```text
Home
Photos
Notices
Documents
```

Parent onboarding:

```text
Install app
→ Open installed app
→ Scan Family QR
→ Done
```

The parent should never see cryptographic terminology.

---

# 55. Security Invariants

1. **Operator/server privileges alone never provide plaintext Teacher Keys.**
2. **Operator/server privileges alone never provide plaintext Family Keys.**
3. **Operator/server privileges alone never provide plaintext Group Keys.**
4. **Family QR and Teacher QR secrets are never stored on the server.**
5. **The server stores only token hashes/verifiers for authentication.**
6. **Child names are encrypted under the Group Key.**
7. **Consent settings are encrypted under the Teacher Key.**
8. **Private family communication is encrypted under the Family Key.**
9. **Classroom-safe photo bases are encrypted under the Group Key.**
10. **Reveal patches are encrypted under Family Keys.**
11. **The unsafe original classroom photo is never uploaded.**
12. **Reveal ownership is not exposed through family-specific object URLs or plaintext mappings.**
13. **Sensitive browser keys are not stored in plaintext `localStorage`.**
14. **Production must not require `unsafe-eval`.**
15. **Third-party runtime JavaScript is minimized.**
16. **Media is temporary by default.**
17. **Teacher credentials are independently revocable.**
18. **Revoking a credential revokes all sessions created by that credential.**
19. **Temporary Teacher credentials and their sessions expire automatically.**
20. **Family QR rotation does not require re-encrypting historical content.**
21. **Opaque IDs do not encode names or roster order.**
22. **Child ↔ family relationships are stored only inside Teacher-Key-encrypted administration data.**
23. **A child may be linked to multiple Family Keys without weakening reveal privacy.**
24. **Teachers can immediately delete published content from D1 and R2.**
25. **Photo publication requires a classroom-safe preview before upload.**
26. **Family QR rotation updates the existing credential in place and does not set `revoked_at`.**
27. **Encrypted classroom administration writes use optimistic concurrency/version checks.**
28. **Protected R2 media is readable only through an authenticated authorization-checking Worker route.**
29. **Protected media is not served from a shared public cache in V1.**
30. **Application-controlled client caches reconcile deletions, expiry, and authorization changes.**
31. **Pre-deploy build verification includes HTML, CSP expectations, and the Service Worker.**
32. **Public post-deploy verification checks what production actually serves, including HTML, CSP, and the Service Worker.**
33. **Normal family sessions use sliding 90-day expiration from recent authenticated activity.**
34. **Teacher sessions never outlive the TeacherCredential that created them.**
35. **Every PushSubscription belongs to exactly one Session.**
36. **Revoked or expired sessions cannot continue receiving push notifications.**

---

# 56. Simplicity Rules

Prefer the simpler design when both options preserve the blind-vault guarantee.

Prefer:

```text
multiple independent Teacher QR credentials
wrapping one Teacher Key
```

over multiple teacher key hierarchies.

Prefer:

```text
one Family Key shared by family devices
```

over device-specific asymmetric identities.

Prefer:

```text
session credentials
```

over per-device encryption keys.

Prefer:

```text
one common reveal package
```

over family-specific reveal URLs.

Prefer:

```text
catastrophic classroom reset
```

over permanent complex recovery machinery.

Prefer:

```text
Group Key directly encrypting short-lived group content
```

over extra envelope-key layers everywhere.

Prefer:

```text
visible harmless aggregate structure
```

over dummy records, fixed-size padding, and traffic-obfuscation machinery.

---

# 57. Final Cryptographic Architecture

```text
                    TEACHER CREDENTIALS

      Teacher QR A     Teacher QR B     Recovery QR
           │                │                │
           └──────────┬─────┴─────┬──────────┘
                      │           │
                      ▼           ▼
                 independent auth / unlock
                              │
                              ▼
                         Teacher Key
                              │
              ┌───────────────┼───────────────┐
              │               │               │
              ▼               ▼               ▼
          Group Key      Family Key A    Family Key B
              │               │               │
        ┌─────┼─────┐         │               │
        │     │     │         │               │
      roster notices base   private         private
                   photo   content         content
                             │               │
                             ▼               ▼
                         reveal A        reveal B
```

---

# 58. Parent Access Architecture

```text
                         FAMILY QR
                             │
                       Family Secret
                             │
                  ┌──────────┴──────────┐
                  │                     │
           Family Auth Token     Family Unlock Key
                                        │
                                        ▼
                                   Family Key
                                        │
                         ┌──────────────┼──────────────┐
                         │              │              │
                         ▼              ▼              ▼
                  private messages   reveals     wrapped Group Key
                                                       │
                                                       ▼
                                                  Group Key
                                                       │
                                         ┌─────────────┼─────────────┐
                                         │             │             │
                                      notices        roster      base photos
```

---

# 59. Photo Architecture

```text
                         ORIGINAL PHOTO
                              │
                         local only
                              │
                              ▼
                        Tag children
                              │
                              ▼
                     Decrypt consent config
                              │
                              ▼
                        Consent engine
                              │
                 ┌────────────┴────────────┐
                 │                         │
                 ▼                         ▼
          Extract reveal              Blur FAMILY_ONLY
             patches                     faces
                 │                         │
                 │                         ▼
                 │                  CLASSROOM-SAFE BASE
                 │                         │
                 │                    Group Key
                 │                         │
                 ▼                         ▼
        COMMON REVEAL PACKAGE          encrypted base
        ┌────────┬────────┐
        │        │        │
     entry A  entry B  entry C
        │        │        │
    encrypted with respective Family Keys
```

Every family downloads the same reveal package and can decrypt only its own entry or entries.

---

# 60. Recommended V1 Pilot Rollout

> **Superseded:** the build order is the README's “Next slices”. See *Current decisions* at the top.

The architecture in this specification remains the complete V1 target, but rollout should be staged so the simplest and most common real-world flows are validated first.

## 60.1 Pilot Step 1 — Onboarding and Communication

The first real kindergarten pilot should include:

- teacher QR onboarding,
- independent teacher credential revocation,
- temporary/substitute teacher credentials with `expires_at`,
- Family QR onboarding,
- Family QR rotation,
- multiple family devices,
- sliding family-session renewal,
- iOS/Android PWA installation,
- Web Push,
- push removal after session revoke/expiry,
- classroom notices,
- family-private messages,
- session revocation,
- teacher recovery,
- catastrophic reset procedure documentation.

The goal is to validate the highest-volume operational questions with real parents and teachers:

```text
Can parents install the PWA without support?
Can they reliably scan the QR inside the installed app?
Do iOS push notifications behave as expected?
Do multiple devices per family work naturally?
Can teachers add/remove/replace access without confusion?
Does QR recovery work under real conditions?
```

## 60.2 Pilot Step 2 — Privacy-Aware Photos

After onboarding, sessions, push delivery, notices, messages, and recovery are stable, enable the photo subsystem:

- Fabric.js editor,
- manual child tagging,
- encrypted consent lookup,
- classroom-safe base image,
- common reveal package,
- family-specific reveal decryption,
- mandatory preview,
- retention,
- immediate deletion,
- cache reconciliation after deletion.

Photos remain part of V1.

They are simply introduced after the communication foundation has been proven with real users.

This reduces rollout risk without changing the target architecture.

---

# 61. Future V2: Local Face Detection

Automatic face detection is intentionally deferred to V2.

The current production flow uses:

- manual child tagging,
- mandatory classroom-safe preview before publish,
- immediate deletion if a mistake is discovered.

V2 may add **on-device face detection** to make the photo workflow fail-closed:

```text
Photo loaded locally
      ↓
detect all faces locally
      ↓
all detected faces start blurred
      ↓
teacher assigns children
      ↓
consent decides which faces may be revealed
```

Important boundaries:

- detection remains on-device,
- no face recognition is required,
- no biometric embeddings need to be stored on the server,
- the existing manual workflow remains valid even without detection.

Face detection should be added only when it can be implemented reliably without materially increasing privacy or operational complexity.

---

# 62. Final Product Statement

This product intentionally does not use the most sophisticated cryptographic architecture possible.

It is designed to be:

- understandable,
- implementable,
- auditable,
- easy for parents,
- easy for teachers,
- inexpensive to operate,
- resistant to cloud-data exposure,
- and operator-blind for stored sensitive content.

The key product/security tradeoff is explicit:

> **We prefer simple QR-based recovery and an acceptable catastrophic reset path over a complex permanent key-recovery hierarchy.**

The metadata principle is equally explicit:

> **Hide sensitive identity relationships, not harmless aggregate structure.**

The deployment principle is:

> **Server-side privileges should not be enough to decrypt user content, while the client code and production deployment path remain publicly inspectable.**

The rollout principle is:

> **Validate QR onboarding, sessions, push notifications, notices, and private messaging with real families before enabling the more complex photo workflow.**

This specification is the production source of truth unless a later security or legal review identifies a concrete reason to change one of these decisions.
