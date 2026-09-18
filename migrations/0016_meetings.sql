-- Scheduling metadata is public to the server; invitation names stay encrypted with each Family Key.
CREATE TABLE meeting_offers (
 id TEXT PRIMARY KEY,
 classroom_id TEXT NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
 teacher_id TEXT REFERENCES teachers(id) ON DELETE SET NULL,
 created_at INTEGER NOT NULL
);
CREATE TABLE meeting_slots (
 id TEXT PRIMARY KEY,
 offer_id TEXT NOT NULL REFERENCES meeting_offers(id) ON DELETE CASCADE,
 starts_at INTEGER NOT NULL,
 ends_at INTEGER NOT NULL CHECK(ends_at > starts_at),
 child_id TEXT REFERENCES children(id) ON DELETE SET NULL,
 version INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX meeting_slots_time ON meeting_slots(starts_at);
-- One conversation per child in an offer, shared by all that child's family cards.
CREATE UNIQUE INDEX meeting_child_once ON meeting_slots(offer_id,child_id) WHERE child_id IS NOT NULL;
CREATE TABLE meeting_invites (
 offer_id TEXT NOT NULL REFERENCES meeting_offers(id) ON DELETE CASCADE,
 child_id TEXT NOT NULL REFERENCES children(id) ON DELETE CASCADE,
 family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
 label TEXT NOT NULL,
 PRIMARY KEY(offer_id,child_id,family_id)
);
CREATE TRIGGER meeting_no_overlap BEFORE INSERT ON meeting_slots
WHEN EXISTS (
 SELECT 1 FROM meeting_slots s JOIN meeting_offers a ON a.id=s.offer_id
 JOIN meeting_offers b ON b.id=NEW.offer_id
 WHERE (a.classroom_id=b.classroom_id OR a.teacher_id=b.teacher_id)
 AND s.starts_at<NEW.ends_at AND s.ends_at>NEW.starts_at
)
BEGIN SELECT RAISE(ABORT,'meeting-overlap'); END;
-- Moving a child releases their reservations in their previous classroom.
CREATE TRIGGER meeting_child_moved AFTER UPDATE OF classroom_id ON children
WHEN NEW.classroom_id<>OLD.classroom_id
BEGIN
 UPDATE meeting_slots SET child_id=NULL,version=version+1 WHERE child_id=NEW.id;
 DELETE FROM meeting_invites WHERE child_id=NEW.id;
END;
CREATE TRIGGER meeting_child_removed BEFORE DELETE ON children
BEGIN UPDATE meeting_slots SET child_id=NULL,version=version+1 WHERE child_id=OLD.id; END;
-- Removing access also releases a booking once no invited family can manage it.
CREATE TRIGGER meeting_invite_removed AFTER DELETE ON meeting_invites
WHEN NOT EXISTS(SELECT 1 FROM meeting_invites WHERE offer_id=OLD.offer_id AND child_id=OLD.child_id)
BEGIN
 UPDATE meeting_slots SET child_id=NULL,version=version+1 WHERE offer_id=OLD.offer_id AND child_id=OLD.child_id;
END;
CREATE TRIGGER meeting_membership_removed AFTER DELETE ON family_classrooms
BEGIN
 DELETE FROM meeting_invites WHERE family_id=OLD.family_id AND offer_id IN(SELECT id FROM meeting_offers WHERE classroom_id=OLD.classroom_id);
END;
CREATE INDEX meeting_slots_offer ON meeting_slots(offer_id,starts_at);
CREATE INDEX meeting_invites_family ON meeting_invites(family_id);
