# Events and photo privacy — feature plan

Date: 2026-09-19. Status: the first version was implemented locally on 2026-09-20; the pilot and physical-device testing are still outstanding. Current format: [events-format.md](events-format.md). Confirmed decisions: consent changes apply only to future publications; teachers choose event duration as they do for notices; annual albums and photo republication are deferred. The first version uses one classroom per event and requires consent from all linked families for broader sharing.

Starting points: the [original specification](product-spec.md), [current architecture](architecture.md) and [access format](access-format.md). This document records the feature plan and its decisions. The implementation format above takes precedence where the original proposals below have evolved.

## 1. Outcome

A teacher prepares a photo gallery once. Each family sees its own child and children whose faces may be shared with the event's audience. Other faces remain covered. The server stores only encrypted content and does not compose personalised photos.

An event is a separate publication type: title, event date, description and ordered gallery. The event date is distinct from publication time. A card on the shared board opens the gallery detail. An event is not a notice with ordinary attachments.

The first version uses one classroom per event, giving “families in our classroom” a clear meaning. Multi-classroom publication requires a later decision about whether consent also covers parents in other classrooms.

## 2. Teacher workflow

See the [editor specification](events-editor.md) for interaction details and states.

Confirmed on 2026-09-19: assigning a child automatically selects the next unresolved face; the teacher can always choose a different order manually. Manually adding covers for missed faces is mandatory in the first release. The local editor, publication and parent consent workflows were implemented on 2026-09-20.

1. Choose “New event”, classroom, date, title and description.
2. Select multiple photos. Files open locally first; network transfer happens only after processing and encryption.
3. The app normalises orientation, prepares a working resolution and detects faces locally. Each detected face receives a sticker with a sufficiently large opaque region.
4. The gallery identifies photos awaiting review. Open each photo, tap a sticker and select a child from the classroom.
5. Move or resize stickers, add missed faces, undo mistakes or remove an incorrect detection. Temporarily hiding stickers helps identify children but never changes publication rules.
6. Assign every marked region to a child or explicitly choose “Keep covered”. Unidentified children, guests and adults can stay covered without a catalog entry.
7. Confirm review of the entire photo, including faces the detector missed. Detection does not guarantee that every face is marked.
8. Review the actual result: the fully covered base, a family with no child of its own in the photo, and a selected family. Review uses the same renderer and prepared data as the parent view.
9. Publish the complete event. Transfer reports progress; retries do not duplicate publications. Parents never see a partially prepared event.

On mobile, use a large photo, thumbnail strip, child-selection panel below the photo and comfortable touch targets. Tap selects, drag moves and handles resize; zooming must not accidentally move a sticker. Each sticker has a textual status as well as a colour.

The limit is 30 photos per event, each file at most 10 MB, set in `.env` per installation and subject to memory and processing-time measurements on phones. Process images sequentially rather than holding every original as a decoded bitmap.

## 3. Parent settings

For each of a family's children, offer “Who may see my child's face?”:

- Only families linked to our child.
- Other families in our classroom too.

Default to linked families only. Missing, unreadable or insufficiently confirmed settings must never broaden visibility. Consent belongs to a child rather than the entire family: siblings can have different settings.

Existing application access belongs to a family, not an individual parent. Devices in the same family edit the same setting with a revision check. For children linked to separate families, broader sharing requires every linked family to explicitly allow it; each linked family still sees its own child.

Parents can save a change without waiting for teacher approval. The server stores encrypted consent and advances its revision. Teachers read and apply it when preparing publication. Parents neither need nor receive the Staff Key.

Before this feature, parent devices had no list of their own children: names and child–family links were in Staff-Key-encrypted records. This feature therefore adds a projection of each family's children encrypted with its Family Key. The server allows edits only to that family's consent records. The teacher's client accepts choices only for children actually linked to that family in the catalog. Injecting another child's ID must have no effect. The catalog revision also covers changes to these links.

Read current consent when preparing publication. Final publication atomically checks the consent and catalog revisions used by preparation. A concurrent change requires preparing permissions again. Values remain encrypted; checking revisions does not require the server to know the choices.

## 4. Photo composition and keys

The base permanently replaces all marked faces with opaque covers. Sticker artwork can be baked into it. Hiding an original with HTML/SVG overlays or CSS blur, or sending every face under a common key and conditionally displaying it, is insufficient.

Prepare the following for each photo:

- **Safe base:** a raster with no original pixels inside covered regions, available to the event audience through encryption.
- **Patches:** each has a fresh random key and contains only its designated region. Patches can share an R2 object rather than requiring separate objects.
- **Shared permission package:** encrypted envelopes holding patch keys and composition data. Every viewer fetches the same package; resource paths do not reveal which family owns a hidden face.
- **Staff data:** child labels, geometry and access to patch keys, protected by the Staff Key. The original photo is never uploaded.

The Event Key opens the description, gallery manifest and base images and is protected by the chosen classroom's Group Key. The event package may also include keys for faces shared with the whole audience. Private patch keys appear only in envelopes for linked Family Keys and staff. A parent reading every network response must not obtain a disallowed face's key.

When a child belongs to two families, encrypt the patch once and protect its key for both families. Do not generate full photos for every combination of parents. Cost should grow with the number of faces and eligible recipients, not the number of possible audience combinations.

Use existing AES-GCM primitives, fresh nonces and authenticated context identifying purpose, event, photo, patch and preparation. Different purposes use different labels. Moving a patch or envelope to another event must fail. The concrete format and tests are specified in [events-format.md](events-format.md).

The parent renderer opens the base, opens only accessible patch keys and draws permitted patches. Missing or damaged patches leave the sticker in place. Downloads use the same final raster. Thumbnails must follow the same rules; never create a shared thumbnail from an unprotected original.

### Geometry is part of the protection

Sticker decoration and the security mask are separate concerns. Artwork with holes, transparent edges or a narrow shape still needs an opaque base across the entire protected region. Build the safe raster before resizing or compressing so filtering cannot carry original pixels across its boundary.

A patch revealing child A must not contain child B's face pixels, even along an edge or in invisible RGB channels under transparency. This applies when a parent decodes the patch directly without the application renderer. Face patches zero overlap pixels in every channel. Separate overlap patches are available only to recipients allowed to see every involved face. Areas involving a permanent cover stay covered. Drawing a second sticker over an already leaked patch is not sufficient.

Moving a mask after publication may require selecting the original again: removed pixels cannot be recovered. Withdraw an incorrectly labelled event first, then prepare a corrected publication with fresh keys and review.

## 5. Consent changes — confirmed decision

**Agreed:** a setting change applies only to future publications. Use the consent snapshot validated at final publication, including drafts started before the change. Existing events keep their applied rules and do not change visibility retroactively. Teachers can remove an event immediately. Parent settings must explain this behaviour clearly.

Later, teachers may be able to select existing photos and republish them using current consent, a new review and fresh cryptographic preparation. This would be a new publication rather than a silent change to an old one. Decide how the old event is handled when designing that feature. Previously downloaded copies cannot be recalled. Republication is outside the first release.

While a photo exists, encrypted labels, geometry and staff data should support preparing it again without repeating labelling where the retained pixels allow it. This does not extend retention or preserve the original; changing a mask may require selecting the original again.

## 6. Detection and editor

The first local detector is MediaPipe Face Detector. It returns face positions, not a child's identity. Teachers choose identities. Do not introduce embeddings, a biometric template database or an external recognition service.

The [official documentation](https://developers.google.com/edge/mediapipe/solutions/vision/face_detector/web_js) describes a JavaScript API with synchronous detection calls, so run inference in a Web Worker. Host the model and WASM on the application's origin, load them only when needed and pin versions. Check model/runtime licensing, CSP, download size and real iOS/Android PWA behaviour.

The first editor uses SVG controls and canvas export. Its actions are sufficiently limited to implement directly. Fabric.js remains an alternative if custom controls become too complex; it provides [selection, movement and scaling](https://www.fabricjs.com/docs/core-concepts/). The original specification suggested it, but the application does not depend on it. Evaluate touch, zoom, memory and accessibility before adding an editor library.

Test distant faces, profiles, partially obscured faces, group photos, varied lighting and orientation. Do not promise accuracy percentages without measurements. If detection fails or finds nothing, allow manual covers and require review rather than automatically publishing.

Start with locally generated SVG stickers. A later sticker pack changes decoration, not the protection format. Arbitrary SVG uploads are outside the first release.

## 7. Integration with the existing application

- Add a dedicated `events` module alongside notices and messages, with its own publication type and API routes. Do not overload `photos.ts`, which handles notice-board photos.
- Reuse image decoding for JPEG/PNG/HEIC, raster conversion, cryptographic primitives, authorisation, storage limits and gallery patterns where appropriate.
- D1 stores event ID, classroom, author, timestamps, state, revisions, expiry, object links and encrypted manifests. Child names, face labels and consent values remain encrypted.
- Include all R2 objects in `named_objects`, storage accounting and cleanup. Authorise uploads, retrieval, publication and deletion. Media must have no public URLs.
- Preparation and upload use staging. Final checks of objects, revisions and permissions publish the event atomically. Repeating the final action must not send duplicate push notifications.
- Deletion and expiry immediately stop retrieval; physical cleanup follows the existing reliable mechanism. Do not serve photos from a public cache. The current service worker caches nothing.
- Push payloads contain no description, photo or child identity. Keep Croatian and English localisation together.
- Online editing and preparation in the open page are sufficient for the first release. Persistent drafts require a separate design for encrypted local storage and must not be introduced implicitly.

Before the pilot, close the access boundary documented in `access-format.md`: replacing a family's card could let a teacher reach that family's other classrooms. Family-card replacement is now restricted to admins. The shared Staff Key remains an existing, documented compromise that warrants review for children's photos.

## 8. Annual albums and retention

**Agreed:** teachers choose event duration as for notices: 1, 3, 7, 14, 30, 60 or 90 days, defaulting to 30. Expiry removes access and schedules deletion of photos, patches and retained preparation data through the existing cleanup mechanism.

Annual albums are deferred. A future explicit “Save for annual album” option can have a separate retention period, a clear deletion date and storage-capacity checks. Do not keep a hidden archive beyond the promised deletion date. Photos deleted before the album feature arrives will not be available to it.

Include date, photo order, description and format version in the event model now, allowing a future album to reuse the personalised renderer. Keep those fields only for the event's lifetime. Album export, memory selection and page design are outside the first release.

## 9. Delivery sequence and completion criteria

1. **Rules and access review.** Settle audience scope, multiple linked families and card-replacement permissions. Consent-change and retention decisions are recorded in sections 5 and 8. Document the cryptographic format and threat model.
2. **One-photo vertical proof.** Mark two or three faces, prepare a safe base and encrypted patches, open them as different families and export a final image. Test disallowed keys, overlaps and malformed packages before production publication.
3. **Parent settings.** Project linked children, encrypt consent, apply restrictive defaults and revision checks, and test that another child's injected ID has no effect.
4. **End-to-end events.** Connect galleries, manual masks, assignments, real previews, staging uploads, atomic publication, board cards, parent views, downloads, push, deletion and expiry.
5. **Detection and teacher workflow.** Add local detection, automatic stickers, manual correction, gallery navigation and phone measurements. This belongs to the first product release even if it follows foundation checks.
6. **Pilot.** Check real-gallery processing time, incorrect assignments, interrupted networks, consent changes during publication, HEIC input, memory, authorisation and every audience view. Update the privacy description and implementation documentation.

Required scenarios: own child only, group-visible child, siblings with different settings, a child linked to two families, unknown face, no detections, overlapping masks, damaged patch, revoked session, another classroom's access, concurrent consent change, partial upload and deletion during viewing. Test decoded patch pixels rather than only the visible interface.

The first version is complete when a teacher prepares an event once, each family receives the correct view and download, and an unauthorised face cannot be extracted from the data delivered to that family. Detection reduces manual effort; human review remains part of publication.
