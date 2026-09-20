# Event photo editor

Status: the first-version workflow was implemented on 2026-09-20; physical iOS/Android testing and the pilot are still outstanding. Drafts exist only in the open session.

The editor includes local detection in multiple orientations, manual covers, three stickers, child assignment, undo/redo and review. Review first shows the final raster; an optional comparison slider shows the original with labelled sides. The family-card selector also includes the names of linked children. Parent settings, encrypted patches, publication, galleries, downloads and deletion are connected. See [format and security boundaries](events-format.md).

## Basic workflow

Three steps: **Event → Photos → Review and publish**. Teachers work on one photo at a time. There is no separate wizard for each face: tap a sticker, choose a child and continue. The basic view stays simple, with movement and resizing available for the selected sticker.

The teacher first enters the title, description, date, audience and duration, as with notices. Photos can be added and removed until publication. Originals open locally; “Add photos” does not mean they have been uploaded.

## Editor layout

On mobile, the photo takes up most of the screen, with “Photo 2 of 8” above it and the status and selected-face panel below. The panel must not obscure the active face: the image uses the available space. Desktop follows the same full-width photo layout, with assignment below it. Do not introduce a separate, complex desktop tool.

A thumbnail strip allows navigation to any photo without losing work. Each thumbnail has a number and text status; a grid overview is a possible extension for larger galleries. Replacing a photo with a new file clears its labels and review confirmation.

Primary actions: **Add cover**, **Show original**, **Undo**, **Done, next photo**. Redo sits beside Undo. Descriptive metadata stays outside the photo workspace.

## Selecting and labelling faces

Detection places numbered, opaque stickers. The first unresolved face is initially selected. Selecting a face shows a small local crop of the original in the panel, so the teacher can identify it without repeatedly hiding every sticker. The original crop is only for editing on the teacher's device.

The panel asks **“Who is in the photo?”** and lists the classroom's children, with name search for longer lists. Children already labelled in the photo have an “Already in photo” marker but remain selectable: a child may also appear in a mirror. Do not suggest identity from a face or automatically copy it from a neighbouring photo.

Choosing a name immediately saves the assignment in the draft and advances to the next unresolved face. A brief status confirms “Assigned: Ana”; Undo restores both the assignment and the previous selection. After the last face, the teacher reviews the whole photo rather than automatically moving to the next photo.

The teacher can always tap any sticker and change the assignment. Visibility information, when shown beside a name, describes “Classroom families” or “Linked families only”; it is not a switch. Parent consent cannot be changed in the editor.

Alternative decisions for a detected region:

- **Keep covered:** protect the face from everyone without linking it to a child.
- **Remove cover** (trash icon): remove an incorrect detection as a secondary, undoable action. Avoid an ambiguous “Delete” label.

Unresolved faces block photo completion. Do not assign children or approve photos automatically based on detector confidence.

## Movement, size and the original

The first tap selects a sticker. Dragging an already selected sticker moves it; a corner handle resizes it. The shape stays the same, with a minimum size and a clear boundary around the covered area. Both detected and manual covers can shrink to 4 pixels per axis in the working image. Assigning a child does not resize a cover.

The photo uses the editor's full width. Add cover, original, undo/redo icons and zoom sit above it; child assignment sits immediately below. There are no separate size sliders or movement buttons. Arrow keys move a cover; Alt + arrow keys resize it. A green border means a child is assigned, red means keep covered, and white means unresolved. Sticker rotation and freehand masks are outside the first release.

Drag outside the selected sticker to pan the photo. Two fingers zoom the image, never the sticker. Starting a two-finger gesture cancels an active sticker drag. Viewport and zoom changes do not alter image-space protection coordinates.

**Show original** temporarily hides covers only in the teacher's view. The button changes to **Restore covers**, without an extra label shifting the photo. Covers return when switching photos, leaving the editor, losing application focus or opening review. The button works with touch and keyboard; holding it down is not the only way to use it. It never changes export rules.

**Add cover** places a generously sized sticker at the centre of the current view and immediately selects it for movement and assignment. Zooming into a missed face before adding the cover makes this easier. Guests and adults can remain covered.

Overlapping covers trigger a warning. Overlap areas become separate encrypted patches with the intersection of all involved faces' permissions. If any involved cover is permanent, its overlap is not exported. The editor does not promise that a family's own face will always be completely revealed when covers overlap.

## Photo review

Once every detected and manually added face is resolved, the teacher checks the entire image for missed faces. Labelled detections do not prove that the detector found everyone. The teacher completes the photo with **“Reviewed, next”**.

If detection finds nothing, show “No faces found — review the photo”. Manual review or adding covers is still required. Detection failure offers retry and manual labelling; it never automatically marks the photo ready.

Changing a child assignment, position or size, or adding or removing a cover, invalidates the photo's review. Repeated detection must not silently replace manual work; existing corrections are preserved when new suggestions are added.

## Final event review

Review uses the actual prepared raster and patches, through the same renderer used by parents. The initial **“All covers”** view checks the safe base. Teachers can also select the view of a family without its own child in the photo, a specific family, or staff. Family options include the card name and linked children's names. The selected audience applies across the gallery. The final image is shown first; comparison with the original is a separate toggle with labelled sides.

Publication does not require manually checking every possible family. It requires reviewed photos, valid permissions and final gallery review. Teachers can return to editing to fix a photo; changes require its review again.

The final action is **“Publish event”**, with the audience and duration available in the form. Upload shows real progress and a clear status; the event appears only when the entire publication is ready. If parent settings changed, preserve manual labels, prepare permissions again and request another review of the changed result. Do not send the teacher back to the beginning.

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
