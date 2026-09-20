# Event photo editor

Status: the first-version workflow was implemented on 2026-09-20 and its three steps were brought into the rest of the app's shapes and words on 2026-09-20; physical iOS/Android testing and the pilot are still outstanding. Drafts exist only in the open session.

The editor includes local detection in multiple orientations, manual covers, three stickers, child assignment, undo/redo and review. One switcher, under the photo while marking it and above it in the review, shows the final photo or the original. The name of each named child is written on their cover, on this device only: names never enter a published photo. The family-card selector also includes the names of linked children. Parent settings, encrypted patches, publication, galleries, downloads and deletion are connected. See [format and security boundaries](events-format.md).

## Basic workflow

Three steps: **Event → Photos → Review and publish**, with the step the teacher is on named above the page. Teachers work on one photo at a time. There is no separate wizard for each face: tap a sticker, choose a child and continue. The basic view stays simple, with movement and resizing available for the selected sticker.

The first step asks for the classroom, title, date, description and duration, in the fields, the text editor and the day tiles a notice's form uses — the description is written with the same toolbar, without the paper colours, and read on the board and in the gallery through the same checked document; a teacher with one classroom sees which it is rather than choosing. The classroom settles there, because it decides which children can be named, and it is locked once photos are open. The next step takes up to 30 photos, each file at most 10 MB — `PUBLIC_EVENT_PHOTOS` and `PUBLIC_EVENT_PHOTO_MB` in `.env`, read when the app is built — and makes each one smaller on this device before anything is sent. Photos can be added and removed until publication. Originals open locally; “Add photos” does not mean they have been uploaded.

## Editor layout

On mobile, the photo takes up most of the screen, with “Photo 2 of 8” above it and the status and selected-face panel below. The panel must not obscure the active face: the image uses the available space. Desktop follows the same full-width photo layout, with assignment below it. Do not introduce a separate, complex desktop tool.

Under the faces, each photo takes a few optional words of its own, up to 300 characters, which everyone who opens the event reads under it. A thumbnail strip allows navigation to any photo without losing work. Each thumbnail carries its number and a mark for what it still needs — a tick when reviewed, the number of faces waiting, a dot while faces are being looked for — and says the same in words to a screen reader and in its tooltip; above the strip, “2 of 8 photos reviewed” says how far the gallery has got. A grid overview is a possible extension for larger galleries. Removing a photo asks first, because its labels go with it. Replacing a photo with a new file clears its labels and review confirmation.

Primary actions: **Add cover**, **Undo**, **Done, next photo**, with the final/original switcher under the photo. Redo sits beside Undo. Descriptive metadata stays outside the photo workspace. The photo itself is square-cornered and fills the workspace's width; only the panel around it follows the app's rounded cards.

## Selecting and labelling faces

Detection places numbered, opaque stickers. The first unresolved face is initially selected. Selecting a face shows a small local crop of the original in the panel, so the teacher can identify it without repeatedly hiding every sticker. The original crop is only for editing on the teacher's device.

The panel asks **“Who is in the photo?”** and lists the classroom's children, with name search for lists longer than eight. Children already labelled in the photo carry a small tick, and say “Already in photo” to a screen reader, but remain selectable: a child may also appear in a mirror. Do not suggest identity from a face or automatically copy it from a neighbouring photo.

Choosing a name immediately saves the assignment in the draft and advances to the next unresolved face. A brief status under the panel confirms “Named: Ana”, for everyone rather than only for screen readers; Undo restores both the assignment and the previous selection. After the last face, the teacher reviews the whole photo rather than automatically moving to the next photo.

A named cover carries the child's name across its lower edge, outlined so it reads over any sticker, and squeezed to the cover's width rather than reaching into its neighbour. The name follows the cover while it is moved or resized, and it is drawn over the picture on the teacher's device: it is never part of what is published or shown to a family.

The teacher can always tap any sticker and change the assignment. Visibility information, when shown beside a name, describes “Classroom families” or “Linked families only”; it is not a switch. Parent consent cannot be changed in the editor.

Alternative decisions for a detected region:

- **Keep covered:** protect the face from everyone without linking it to a child.
- **Remove cover** (trash icon): remove an incorrect detection as a secondary, undoable action. Avoid an ambiguous “Delete” label.

Unresolved faces block photo completion. Do not assign children or approve photos automatically based on detector confidence.

## Movement, size and the original

The first tap selects a sticker. Dragging an already selected sticker moves it; a corner handle resizes it. The shape stays the same, with a minimum size and a clear boundary around the covered area. Both detected and manual covers can shrink to 4 pixels per axis in the working image. Assigning a child does not resize a cover.

The photo uses the editor's full width. Add cover, undo/redo icons and zoom sit above it; the final/original switcher and child assignment sit immediately below. There are no separate size sliders or movement buttons. Arrow keys move a cover; Alt + arrow keys resize it. A green border means a child is assigned, red means keep covered, and white means unresolved. Sticker rotation and freehand masks are outside the first release.

Drag outside the selected sticker to pan the photo. Two fingers zoom the image, never the sticker. Starting a two-finger gesture cancels an active sticker drag. Viewport and zoom changes do not alter image-space protection coordinates.

The switcher under the photo has two sides, **Final photo** and **Original photo**; the original temporarily hides the covers and the names in the teacher's view only. Covers return when switching photos, leaving the editor, losing application focus or opening review. The switcher works with touch and keyboard; holding a button down is not the only way to use it. It never changes export rules.

**Add cover** places a generously sized sticker at the centre of the current view and immediately selects it for movement and assignment. Zooming into a missed face before adding the cover makes this easier. Guests and adults can remain covered.

Overlapping covers trigger a warning. Overlap areas become separate encrypted patches with the intersection of all involved faces' permissions. If any involved cover is permanent, its overlap is not exported. The editor does not promise that a family's own face will always be completely revealed when covers overlap.

## Photo review

Once every detected and manually added face is resolved, the teacher checks the entire image for missed faces. Labelled detections do not prove that the detector found everyone. The teacher completes the photo with **“Reviewed, next photo”**, which is refused while a face is unresolved and says how many are left. A photo already reviewed says so and offers the next one instead.

If detection finds nothing, show “No faces found — review the photo”. Manual review or adding covers is still required. Detection failure offers retry and manual labelling; it never automatically marks the photo ready.

Changing a child assignment, position or size, or adding or removing a cover, invalidates the photo's review. Repeated detection must not silently replace manual work; existing corrections are preserved when new suggestions are added.

## Final event review

Review uses the actual prepared raster and patches, through the same renderer used by parents. The initial **“All covers”** view checks the safe base. Teachers can also select a specific family, whose option names the card and its linked children. The selected audience applies across the gallery. The same switcher as in the editor picks the final photo, with the names of the children on their covers, or the original.

The audience list holds the safe base, “All covers”, and the event's families by name; the staff and outsider views were taken out after the first teacher's use, because a teacher checks the covers and what each family sees.

Publication does not require manually checking every possible family. It requires reviewed photos, valid permissions and final gallery review. Teachers can return to editing to fix a photo; changes require its review again.

The final action is **“Publish event”**, beside the way back to the photos, under a line repeating the title, date and duration entered in the first step. Preparing and uploading show a bar and a count; the event appears only when the entire publication is ready. If parent settings changed, preserve manual labels, prepare permissions again and request another review of the changed result. Do not send the teacher back to the beginning.

## States and recovery

| Photo state  | What the teacher sees                            | Next action                        |
| ------------ | ------------------------------------------------ | ---------------------------------- |
| Preparing    | “Preparing photo…”                               | Work on other ready photos         |
| Detecting    | “Finding faces…”                                 | Wait, cancel or continue manually  |
| Needs labels | “3 faces remaining”                              | Assign a child or keep covered     |
| Needs review | Review-needed status                             | Check the whole photo manually     |
| Reviewed     | “Reviewed”                                       | Next photo or final review         |
| Problem      | Specific message, such as “Unable to open photo” | Retry, replace or remove the photo |

Switching photos and steps preserves the draft during the open session. The first release does not promise recovery after closing the application or operating-system termination. Explain this before extended editing, and warn about losing work when navigating away in the app. Measure this risk on phones during the pilot. If interruptions frequently lose work, persistent encrypted drafts become a pilot exit requirement.

Per-photo undo/redo covers labels and geometry, not parent consent. Manual editing of one photo must not wait for detection on the remaining photos. Bound background processing to limit phone memory use.

## First-release scope and teacher testing

Include detection, name assignment, a private identification crop, adding/moving/resizing covers, original view, undo/redo, gallery review and family previews. Three built-in stickers are available; choosing artwork is optional. A later sticker pack must not change the security mask.

Defer filters, freeform text on photos, sticker rotation, identity recognition, copying face positions between photos and bulk approval of unreviewed photos.

During the pilot, measure gallery labelling time, incorrect assignments, returns to previous faces, accidental movement while zooming, use of the original and lost drafts. Check whether automatic advancement helps or confuses teachers. The earlier interactive conversation prototype demonstrated assignment and audience differences, not detection, secure processing or a finished editor.

## The published gallery

A family or teacher opens the event from its board card: the title, the day, the description as it was written, then the photos one at a time with the teacher's words under each. Tapping a photo opens it on the whole screen in the same viewer as a board photo or a notice's picture, where a swipe, the arrows or the arrow keys move through the gallery, its number and words show under it, and Save keeps a JPEG of it on the device. Photos are decrypted and composed for whoever holds the card, one at a time, so a swipe to a photo that isn't ready yet says it's opening. Under a gallery of more than one photo, **Save all photos** composes every photo in turn, counting them as it goes, and keeps them together: the share sheet on iPhone and iPad, where Save Images puts them in Photos, and one zip file of the whole gallery elsewhere.
