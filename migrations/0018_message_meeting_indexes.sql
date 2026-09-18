-- Indexes the messages and meetings queries turned out to need. Each one replaces a scan of a table that
-- grows with every message sent and every time offered.

-- A family's own inbox and its monthly allowance ask by family first, which `conversations_family` can't
-- answer: it starts with the classroom, which those queries don't name. The same order serves the composite
-- key back to `family_classrooms`, so removing a family from a classroom stops scanning conversations.
CREATE INDEX conversations_by_family ON conversations(family_id,classroom_id);

-- Moving or removing a child, and removing a teacher, reach the meetings tables through these columns. The
-- unique index on (offer_id,child_id) can't serve a child on its own.
CREATE INDEX meeting_slots_child ON meeting_slots(child_id);
CREATE INDEX meeting_invites_child ON meeting_invites(child_id);
CREATE INDEX meeting_offers_teacher ON meeting_offers(teacher_id);
