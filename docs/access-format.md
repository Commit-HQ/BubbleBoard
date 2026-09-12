# Access and encryption format

Format version 1: the keys, cards, and encrypted records behind classroom access. `src/lib/crypto.ts` implements keys and envelopes, `src/lib/paths.ts` card links, and their tests check the properties below. It follows the [product specification](product-spec.md), §5–15 and §31–35.

A change to any bytes described here, on printed cards, in stored envelopes, or in derived values, needs a new format version. Readers reject versions they don't know.

## Keys

Every key is 256 random bits from `crypto.getRandomValues`, generated in the browser and used with AES-256-GCM.

| Key         | One for each | Opens                                                                       |
| ----------- | ------------ | --------------------------------------------------------------------------- |
| Teacher Key | classroom    | classroom administration, the Group Key, and every Family Key               |
| Group Key   | classroom    | the classroom profile (name and welcome); later notices, roster, and photos |
| Family Key  | family       | the Group Key for that family; later its private messages and photo reveals |

Keys aren't rotated within a classroom. The catastrophic reset (§12) creates a new classroom, and since every envelope is bound to its classroom ID, that ID also identifies the key generation.

## Cards

A card holds a 256-bit secret. Its QR code is a link to the installation's app page, with the secret in the fragment:

```text
https://bubbleboard.example.com/app#family=<secret>
https://bubbleboard.example.com/en/app#teacher=<secret>
```

- `<secret>` is 43 characters of base64url (RFC 4648 §5, without padding). Decoders accept only the canonical spelling, so each value has exactly one.
- Browsers don't send fragments with requests. The app never sends, stores, or logs the secret, and removes the fragment from the address bar once it has read it.
- Recovery cards are teacher cards; only the server's credential record tells them apart.
- Reading a card uses only its origin and fragment. The path can be in either language, and printed cards outlive route changes, so `/app` and `/en/app` must always open the app.
- A card with a different origin is reported as belonging to another installation.

## Values derived from a card

HKDF-SHA-256, with an empty salt, derives two values from the secret. The `info` labels keep them, and the two roles, apart:

| Value      | `info` (UTF-8)                                                    | Use                                                                                     |
| ---------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Auth token | `BubbleBoard 1 teacher-auth`, `BubbleBoard 1 family-auth`         | 256 bits, sent in base64url to authenticate; the server stores the SHA-256 of its bytes |
| Unlock key | `BubbleBoard 1 teacher-key-wrap`, `BubbleBoard 1 family-key-wrap` | a non-extractable AES-256-GCM key that opens the credential's wrapped key               |

The server sees the auth token whenever a device connects with a card. HKDF gives it no way back to the secret or across to the unlock key.

## Envelopes

Everything encrypted, wrapped keys and data alike, is stored as one string:

```text
1.<iv>.<ciphertext>
```

`1` is the format version, `<iv>` a fresh random 96-bit IV, and `<ciphertext>` the AES-256-GCM output ending in its 128-bit tag, both in base64url. The additional authenticated data is this JSON array, encoded as UTF-8:

```json
["BubbleBoard", 1, "<purpose>", "<classroom ID>", "<subject ID or null>"]
```

The subject is the credential or family the record belongs to. An envelope opens only with the right key _in the record it was written for_: moved to another row, classroom, family, or purpose, even under the same key, it fails to decrypt rather than yielding the wrong key.

| Purpose                      | Holds       | Encrypted with                      | Subject       |
| ---------------------------- | ----------- | ----------------------------------- | ------------- |
| `teacher-key-for-credential` | Teacher Key | the teacher credential's unlock key | credential ID |
| `family-key-for-credential`  | Family Key  | the family credential's unlock key  | credential ID |
| `family-key-for-teacher`     | Family Key  | Teacher Key                         | family ID     |
| `group-key-for-teacher`      | Group Key   | Teacher Key                         | `null`        |
| `group-key-for-family`       | Group Key   | Family Key                          | family ID     |
| `classroom-profile`          | JSON data   | Group Key                           | `null`        |
| `classroom-admin`            | JSON data   | Teacher Key                         | `null`        |

A wrapped key is its 32 raw bytes, encrypted like data. Record IDs are 128 random bits in base64url (22 characters) and encode nothing. The browser generates them, because it binds them into envelopes before the server stores anything.

## Keys in the browser

- Raw key bytes exist only while a key is created, imported, or re-wrapped for another recipient, and are overwritten afterwards. That is best effort: JavaScript can't guarantee that no copy remains.
- Every `CryptoKey` in use is non-extractable. That prevents accidental export; it doesn't stop a malicious script running in the app from using the keys (§36).
- A key is re-wrapped only as its own kind: a Group Key is never stored as a Family Key.

A device keeps one IndexedDB record, holding `CryptoKey` objects rather than key strings:

| Device  | Keeps                                                    | Because                                                                                                                                                                                |
| ------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Teacher | classroom ID, credential ID, the credential's unlock key | Teacher credentials are revoked, never replaced in place, so the unlock key keeps opening the Teacher Key. Opening it from its envelope is also how a teacher wraps it for a new card. |
| Family  | classroom ID, family ID, Family Key                      | Replacing a family card changes its unlock key but not the Family Key, so devices that are already connected keep working.                                                             |

Other keys are unwrapped into memory from envelopes fetched with the device's session. A device needs both: missing or unreadable local keys mean scanning the card again whatever the session says, and a session alone decrypts nothing.

## What the server stores

Opaque IDs, timestamps, hashes of auth and session tokens, and envelopes. It never receives a card secret, an unlock key, a raw key, a classroom, child, or family name, or welcome text.

## Limits

- Anyone holding a key can write envelopes that open with it. Families hold the Group Key, so group content isn't cryptographically tied to a teacher; server authorization decides who may write.
- No signatures, no forward secrecy, and no key rotation beyond replacing a family card (§8) and resetting a classroom (§12).
