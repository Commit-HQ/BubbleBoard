-- Every face-sharing choice written for a child and one of its family cards, so the family and staff can see
-- when sharing was allowed or withdrawn, and who did it. The choice stays sealed with the family's key, as it
-- is in `photo_families`; only when it was written, which teacher recorded it from a consent form, and whether
-- that was as the child was added, are readable. A family's own choice has no teacher. The teacher's ID stays
-- after the teacher is removed, when the app just says staff. The trail goes with the child or the family
-- card, and when the card is taken off the child (events.ts); removing a family card deletes by `family_id`.
CREATE TABLE photo_history (
 child_id TEXT NOT NULL REFERENCES children(id) ON DELETE CASCADE,
 family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
 choice TEXT NOT NULL,
 at INTEGER NOT NULL,
 teacher_id TEXT,
 child_added INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX photo_history_child ON photo_history(child_id,family_id,at);
CREATE INDEX photo_history_family ON photo_history(family_id);
