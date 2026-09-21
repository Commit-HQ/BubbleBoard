-- Photo consent is encrypted with the family's key; this clock protects publication from stale consent.
-- One row per classroom, so a parent's change in one classroom doesn't throw away another teacher's
-- half-prepared event. Every classroom has a row, from this backfill and from the trigger below.
CREATE TABLE photo_clock (
 classroom_id TEXT PRIMARY KEY REFERENCES classrooms(id) ON DELETE CASCADE,
 revision INTEGER NOT NULL
);
INSERT INTO photo_clock SELECT id,0 FROM classrooms;
CREATE TRIGGER photo_clock_started AFTER INSERT ON classrooms BEGIN INSERT INTO photo_clock VALUES(NEW.id,0); END;
CREATE TABLE photo_families (
 child_id TEXT NOT NULL REFERENCES children(id) ON DELETE CASCADE,
 family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
 label TEXT NOT NULL,
 choice TEXT,
 revision INTEGER NOT NULL DEFAULT 0,
 PRIMARY KEY(child_id,family_id)
);
-- A row belongs to the classroom its child is in, so only that classroom's clock moves. Two deletions can't
-- find that classroom: `photo_child_moved` below runs after the child already carries its new classroom, and
-- a removed child takes its rows with it through the cascade, leaving nothing to look up. Both are catalog
-- changes, which move `installation.revision` (catalog.ts writes every child change through `nextRevision`),
-- and `event_publish` compares that too, so the publication still fails as stale.
CREATE TRIGGER photo_family_added AFTER INSERT ON photo_families BEGIN
 UPDATE photo_clock SET revision=revision+1 WHERE classroom_id=(SELECT classroom_id FROM children WHERE id=NEW.child_id); END;
CREATE TRIGGER photo_family_removed AFTER DELETE ON photo_families BEGIN
 UPDATE photo_clock SET revision=revision+1 WHERE classroom_id=(SELECT classroom_id FROM children WHERE id=OLD.child_id); END;
CREATE TRIGGER photo_choice_changed AFTER UPDATE OF choice ON photo_families BEGIN
 UPDATE photo_clock SET revision=revision+1 WHERE classroom_id=(SELECT classroom_id FROM children WHERE id=NEW.child_id); END;
CREATE TRIGGER photo_child_moved AFTER UPDATE OF classroom_id ON children WHEN OLD.classroom_id<>NEW.classroom_id
BEGIN DELETE FROM photo_families WHERE child_id=NEW.id; END;
CREATE TRIGGER photo_membership_removed AFTER DELETE ON family_classrooms
BEGIN DELETE FROM photo_families WHERE family_id=OLD.family_id AND child_id IN(SELECT id FROM children WHERE classroom_id=OLD.classroom_id); END;
CREATE TABLE events (
 id TEXT PRIMARY KEY,
 classroom_id TEXT NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
 teacher_id TEXT REFERENCES teachers(id) ON DELETE SET NULL,
 credential_id TEXT NOT NULL,
 event_key TEXT,
 content TEXT,
 posted_at INTEGER,
 expires_at INTEGER NOT NULL,
 catalog_revision INTEGER NOT NULL,
 consent_revision INTEGER NOT NULL
);
CREATE INDEX events_classroom ON events(classroom_id,posted_at);
CREATE TABLE event_files (
 event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
 id TEXT NOT NULL,
 PRIMARY KEY(event_id,id)
);
CREATE TRIGGER event_files_stored BEFORE INSERT ON event_files WHEN NOT EXISTS(
 SELECT 1 FROM stored_objects WHERE key='events/'||NEW.event_id||'/'||NEW.id AND deleting=0
) BEGIN SELECT RAISE(ABORT,'stale'); END;
CREATE TRIGGER event_files_leaving AFTER DELETE ON event_files BEGIN
 UPDATE stored_objects SET deleting=1 WHERE key='events/'||OLD.event_id||'/'||OLD.id;
END;
-- The compare and the write run in the same publication transaction.
CREATE TRIGGER event_publish BEFORE UPDATE OF posted_at ON events WHEN OLD.posted_at IS NULL AND NEW.posted_at IS NOT NULL
AND (NEW.catalog_revision<>(SELECT revision FROM installation)
 OR NEW.consent_revision IS NOT(SELECT revision FROM photo_clock WHERE classroom_id=NEW.classroom_id))
BEGIN SELECT RAISE(ABORT,'stale'); END;
DROP VIEW named_objects;
CREATE VIEW named_objects AS
SELECT 'board/'||classroom_id||'/'||id AS key FROM board_photos
UNION ALL SELECT 'notices/'||notice_id||'/'||id FROM notice_files
UNION ALL SELECT 'info/'||page_id||'/'||id FROM info_files
UNION ALL SELECT 'events/'||event_id||'/'||id FROM event_files;
