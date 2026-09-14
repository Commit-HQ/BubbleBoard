# Access and encryption format

The keys, cards, and encrypted records behind kindergarten access. `src/lib/crypto.ts` implements keys and envelopes, `src/lib/card.ts` card codes and links, and their tests check the properties below. It follows the [product specification](product-spec.md), §5–15 and §31–35, except that one Staff Key for the kindergarten replaces a Teacher Key for each classroom ([decisions](next-step-plan.md)). The app calls a card a QR code; this note keeps the word card.

## Versions and upgrades

Cards and encrypted records are versioned separately, because they age differently: a printed card can sit in a drawer for years.

- **Card format 1** is everything a card holds or yields: the code, the `#card=` fragment of its link, and the HKDF labels. It never changes. A future card format gets a new fragment name, and the app keeps reading `#card=` for as long as such cards may exist.
- **Envelope format 1** is the `1.` prefix of every encrypted value and the `1` in its authenticated data. A future format gets a new number; readers keep opening every format written before and reject numbers they don't know.
- Neither follows the app's version, so ordinary updates change neither.

`src/lib/compatibility.test.ts` holds a card code and three envelopes written by a separate implementation of this note that uses only Node's `crypto` module. It fails if a change would stop existing cards from connecting or existing records from opening, even when new round trips still work. Its values are never updated.

## Keys

Every key is 256 random bits from `crypto.getRandomValues`, generated in the browser and used with AES-256-GCM.

| Key        | One for each                                | Opens                                                                                                                                                                 |
| ---------- | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Staff Key  | kindergarten                                | every Group Key and Family Key, the Info Key, and the teacher, child, and family records                                                                              |
| Group Key  | classroom                                   | the classroom profile (its name), the Notice Key of each of its notices, the Info Key, and the photo of its board with its details; later roster and classroom photos |
| Family Key | family                                      | the Group Key of each classroom its children are in, and its answers to polls whose counts families don't see; later its private messages and photo reveals           |
| Notice Key | notice, new at every save                   | the notice's text, paper colour, author name, and poll with any Poll Key, and the name and File Key of each of its files                                              |
| Info Key   | kindergarten, made with its first info page | each info page's text and paper colour, and the name and File Key of each of its files                                                                                |
| File Key   | file on a notice or an info page            | the file's bytes                                                                                                                                                      |
| Poll Key   | poll whose counts families see              | every family's answer to that poll                                                                                                                                    |

Every staff card, admin or teacher, opens the same Staff Key. Which classrooms a teacher sees, and what an admin may change, is decided by server authorization, not encryption. A teacher who also holds a copy of the database, or a server bug that serves another classroom's records, could therefore decrypt that classroom, and a lost staff card together with a database copy exposes the whole kindergarten. Whoever runs the server still reads nothing, and families stay separated by encryption. Separating teachers by encryption too would take an Admin Key, a key for each teacher, and a teacher key for each classroom, re-wrapped in an admin's browser at every change of assignment.

A File Key isn't wrapped: its raw bytes travel inside its notice's content, next to the file's name, so whoever opens the notice opens its files, and the key opens nothing else. A file's bytes then stay as they were when the notice is saved again under a new Notice Key, instead of being encrypted and uploaded again at every save. A classroom taken off the notice can't open its later versions, so it learns the keys of files added afterwards only from the server, which no longer gives it their bytes.

A Poll Key travels the same way, inside its poll, for a poll whose counts families see. Each family's answer to that poll is encrypted with it instead of the family's Family Key, so every device that opens the notice opens every answer and counts them. The server sends those answers to the notice's families, with the random ID of the family that gave each and never a name: only staff can open family names. The key stays as long as the poll shows its counts, so saving the notice again keeps the answers; choosing the other way removes them, because they were encrypted for it.

The Info Key is made when an admin adds the kindergarten's first info page, and every page is encrypted with it, so it isn't replaced when pages are added, changed, or deleted. Every classroom sees every page, so a new key for each page or save, as a notice gets, would keep no one out, and a classroom added meanwhile could get an outdated copy. It's wrapped once for the Staff Key and once for each classroom's Group Key, and an admin's device adding a classroom wraps it for the new classroom from the copy for staff, in the same request. A family that leaves the kindergarten keeps whatever key its devices opened, as it keeps its classrooms' Group Keys, but the server no longer gives it the pages.

Keys aren't rotated. If every staff card is lost, nothing can open the Staff Key, and the catastrophic reset (§12) starts the installation over with new keys and cards.

## Cards

A card holds a 128-bit secret from `crypto.getRandomValues`, written as a 28-character code. The code is printed on the card and carried in its QR link, which opens the installation's app page:

```text
K7Q2-M9PX-3HDR-W8TN-6CJV-ABQE-4RZ5
https://bubbleboard.example.com/app#card=K7Q2M9PX3HDRW8TN6CJVABQE4RZ5
```

- The first 26 characters are the secret's 16 bytes in Crockford's base32 alphabet (`0`–`9` and `A`–`Z` without `I`, `L`, `O`, and `U`), most significant bit first. The last of them carries two spare bits, which must be zero, so each secret has exactly one code.
- The last 2 characters are a check: the sum of each secret symbol's value times its position (1–26), modulo 1021, as two symbols. It catches every mistyped character and every swap of two secret characters, so the app can say "check the code" rather than "card not recognized".
- Readers ignore case, spaces, and dashes, and read `O` as `0` and `I` or `L` as `1`. Printed codes are in groups of four; links carry them without dashes.
- 128 random bits are beyond brute force and short enough to type. The keys a card opens are 256-bit.
- Staff and family cards, recovery cards included, share this format. Only the server's records say what a card is and whether it belongs to an admin.
- A family device can also make a **one-time card** for another of the family's devices, in this format. The server lets it connect one device within 24 hours and ends it when one connects; that device keeps its session afterwards. A family keeps at most five waiting, and a new one ends the oldest. Its link is meant to be sent, to grandparents for example, so once it's used or past its day, a photo or forwarded link of it connects nothing.
- Browsers don't send fragments with requests. The app never sends, stores, or logs the code, and removes the fragment from the address bar once it has read it, except in Safari and the other browsers on iPhone and iPad, where the app can't connect until it's on the Home Screen. There the fragment stays, and those browsers get a web app manifest without `start_url`, for which WebKit takes the page's address, fragment included, so BubbleBoard added to the Home Screen from a card link opens with that card (`src/lib/install.ts`). iOS keeps that address, and with it the code, in Safari's history and with the Home Screen icon on that device.
- A link counts only by its origin and fragment. The path can be in either language, and printed cards outlive route changes, so `/app` and `/en/app` must always open the app. A link with another origin is reported as belonging to another installation.

## Values derived from a card

HKDF-SHA-256, with an empty salt, derives two values from the secret's 16 bytes, kept apart by their `info` labels:

| Value      | `info` (UTF-8)                | Use                                                                                     |
| ---------- | ----------------------------- | --------------------------------------------------------------------------------------- |
| Auth token | `BubbleBoard card 1 auth`     | 256 bits, sent in base64url to authenticate; the server stores the SHA-256 of its bytes |
| Unlock key | `BubbleBoard card 1 key-wrap` | a non-extractable AES-256-GCM key that opens the credential's wrapped key               |

The server sees the auth token whenever a device connects with a card. HKDF gives it no way back to the secret or across to the unlock key.

## Envelopes

Everything encrypted, wrapped keys and data alike, is stored as one string:

```text
1.<iv>.<ciphertext>
```

`1` is the envelope format, `<iv>` a fresh random 96-bit IV, and `<ciphertext>` the AES-256-GCM output ending in its 128-bit tag, both in base64url (RFC 4648 §5, without padding, canonical only). The additional authenticated data is this JSON array, encoded as UTF-8:

```json
["BubbleBoard", 1, "<purpose>", "<classroom ID or null>", "<subject ID or null>"]
```

The classroom is set for records that belong to one classroom, and the subject is the credential, family, teacher, child, notice, photo, or file a record belongs to. An info page's content has its page as its subject; the Info Key's copies have none, since a kindergarten has one Info Key. An envelope opens only with the right key _in the record it was written for_: moved to another row, classroom, family, notice, photo, file, or purpose, even under the same key, it fails to decrypt rather than yielding the wrong key.

Photos and files are too big to carry as text, so they use the envelope's binary form: one byte holding the format, the 12-byte IV, then the ciphertext ending in its tag, with the same additional data. A reader checks the format byte as it checks the `1.` prefix, and refuses anything shorter than those 29 bytes.

| Purpose                     | Holds                                                                                           | Encrypted with                     | Classroom    | Subject       |
| --------------------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------- | ------------ | ------------- |
| `staff-key-for-credential`  | Staff Key                                                                                       | the staff credential's unlock key  | `null`       | credential ID |
| `family-key-for-credential` | Family Key                                                                                      | the family credential's unlock key | `null`       | credential ID |
| `family-key-for-staff`      | Family Key                                                                                      | Staff Key                          | `null`       | family ID     |
| `group-key-for-staff`       | Group Key                                                                                       | Staff Key                          | classroom ID | `null`        |
| `group-key-for-family`      | Group Key                                                                                       | Family Key                         | classroom ID | family ID     |
| `classroom-profile`         | the classroom's name                                                                            | Group Key                          | classroom ID | `null`        |
| `teacher-profile`           | the teacher's name                                                                              | Staff Key                          | `null`       | teacher ID    |
| `child-profile`             | the child's name and families                                                                   | Staff Key                          | `null`       | child ID      |
| `family-profile`            | the family card's name                                                                          | Staff Key                          | `null`       | family ID     |
| `notice-key-for-classroom`  | Notice Key                                                                                      | Group Key                          | classroom ID | notice ID     |
| `notice-content`            | the notice's text, paper colour, author name, poll with any Poll Key, and files' names and keys | Notice Key                         | `null`       | notice ID     |
| `poll-vote`                 | a family's answer to a notice's poll                                                            | the family's Family Key            | `null`       | notice ID     |
| `counted-poll-vote`         | a family's answer to a poll whose counts families see                                           | the poll's Poll Key                | `null`       | notice ID     |
| `board-photo`               | the photo of a classroom's board, as JPEG, WebP, or PNG                                         | Group Key                          | classroom ID | photo ID      |
| `board-photo-details`       | who put a board photo up                                                                        | Group Key                          | classroom ID | photo ID      |
| `notice-file`               | a file on a notice or an info page: a document, or a picture as JPEG, WebP, or PNG              | its File Key                       | `null`       | file ID       |
| `info-key-for-staff`        | Info Key                                                                                        | Staff Key                          | `null`       | `null`        |
| `info-key-for-classroom`    | Info Key                                                                                        | Group Key                          | classroom ID | `null`        |
| `info-page`                 | an info page's text and paper colour, and its files' names and keys                             | Info Key                           | `null`       | page ID       |

A poll's answer names the option chosen by the ID the poll gives it. Its subject ties it to its notice, and the Family Key it's encrypted with ties it to its family: moved to another family's record, it doesn't open with that family's key. An answer encrypted with its poll's Poll Key opens for everyone who opens the notice, and nothing but the server ties it to its family.

A file's name, from a fixed list of document and picture kinds, decides the type a device saves it as; its bytes never do, so a file can't open as a page with the app's origin, whoever wrote it. A picture shows on the board only when its bytes are a JPEG, PNG, or WebP image, as a board photo does, and a device saves WebP as PNG.

A wrapped key is its 32 raw bytes, encrypted like data; data records hold JSON. Record IDs are 128 random bits in base64url (22 characters) and encode nothing. The browser generates them, because it binds them into envelopes before the server stores anything. Names, such as "Ivana (mum)" on a family card, and which families a child belongs to live only inside these records.

## Keys in the browser

- Raw key bytes exist only while a key is created, imported, or re-wrapped for another recipient, and are overwritten afterwards. That is best effort: JavaScript can't guarantee that no copy remains. File Keys and Poll Keys are the exception: their raw bytes are part of the content of their notice or info page, in memory wherever that is open, and each opens only a file or answers that whoever opened it may fetch anyway.
- Every `CryptoKey` in use is non-extractable. That prevents accidental export; it doesn't stop a malicious script running in the app from using the keys (§36).
- A key is re-wrapped only as its own kind: a Group Key is never stored as a Family Key.
- New card codes are shown for printing, or on screen for a one-time card, and kept only in the open page, never in browser storage.

## Stored on a device

A browser has one active card at a time. Its keys are kept in IndexedDB as `CryptoKey` objects, never as key strings, in a record keyed by credential ID, so a later version can keep several cards without migrating data. The record also holds the SHA-256 of the card's auth token, the value the server stores, which is how the device recognizes its own card when it's scanned again (`src/lib/device.ts`).

| Card   | Keeps                                                          | Because                                                                                                                                                                                                                                                                                                                                |
| ------ | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Staff  | the credential's unlock key                                    | Opening the Staff Key from its envelope is how staff wrap keys for new and replaced cards. Staff credentials are revoked, never changed in place, so the unlock key keeps working.                                                                                                                                                     |
| Family | the family ID, the Family Key, and the credential's unlock key | Opening the Family Key from its envelope is how a family device wraps it for a one-time card. The Family Key doesn't change when a card is replaced, which leaves room for a replacement that keeps devices connected. A device connected before 2026-09-14 kept no unlock key, so it makes no one-time cards until it connects again. |

Scanning a different card while the active one works asks before replacing it. Scanning the same card again changes nothing, and a card that no longer works is replaced without asking. Signing out deletes the record.

The Home Screen app on iPhone and iPad also keeps, apart from the card, whether it has used the card in the address it opens at, which it was added from. It uses that card once the server has answered it, so signing out, or a card replaced since, stays that way.

Other keys are unwrapped into memory from envelopes fetched with the device's session. A device needs both: missing or unreadable local keys mean scanning the card again whatever the session says, and a session alone decrypts nothing.

## What the server stores

Opaque IDs, timestamps, hashes of auth and session tokens, envelopes, and a count of changes to teachers, children, and family cards, which keeps two devices from undoing each other's changes. To authorize requests and address notifications, it also knows which classroom each child is in, which classrooms each teacher and family belongs to, which staff are admins, and which classrooms each notice is for, who posted it, when it was posted, changed, and taken down, which families marked it as seen, whether it has a poll, whether families see the poll's counts, and which families answered it, and which files it carries. It knows which photo each classroom's board shows and since when, and keeps its details encrypted beside it. It knows the order of the info pages, when each was last saved, and which files each carries. It knows which of a family's cards are one-time cards, and until when each can connect a device. It keeps the encrypted bytes of board photos and of the files of notices and info pages in R2 and, to stay within the installation's storage limits, the size of each and how many uploads and downloads each month has seen, not who made them. For notifications, it keeps the push service address of each device that turned them on, tied to that device's session; pushes carry no content. It never receives a card code or secret, an unlock key, a raw key other than inside a notice's envelope, any classroom, teacher, child, family, card, or file name, which families a child belongs to, what a poll asks and which answer a family chose, or a photo or file it can open.

## Limits

- Anyone holding a key can write envelopes that open with it. Families hold the Group Key, so group content isn't cryptographically tied to a teacher; server authorization decides who may write. Staff hold every Family Key, so a poll's answer isn't tied to its family by encryption alone either: the server decides which family may answer. The answers to a poll whose counts families see are encrypted with a key everyone who opens the notice holds, so the counts families see are only as honest as the server that sends the answers.
- Staff are kept to their classrooms and roles by server authorization only (see Keys). A teacher may replace the card of a family in their classrooms, and a device connected with the new card sees every classroom the family's children are in; the family's devices are signed out when that happens. This was accepted on 2026-09-13, because notices take the place of a hallway board every teacher can read, and should be closed before classroom photos of children.
- Moving a child, removing a card, or removing a teacher stops server access, not the use of keys a device already opened. Group Keys don't change when a family leaves a classroom.
- Any device of a family can add more of the family's devices with one-time cards, and the kindergarten doesn't see how many, as with a printed family card shared at home. Whoever holds a family device unlocked can add a device of their own. Replacing the family's card, or removing the family, signs out every device, those added with one-time cards too.
- No signatures, no forward secrecy, and no key rotation short of resetting the installation (§12). Replacing a card changes the card, not the Family Key.
