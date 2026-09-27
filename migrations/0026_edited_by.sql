-- Who last changed a notice or an event after it went up, which teachers see beside "edited": any teacher of
-- a notice's classrooms, or of an event's, may change it, so the author alone no longer says who did. Empty
-- when nobody has changed it since, when it was changed before this column, and once that teacher is removed.
ALTER TABLE notices ADD COLUMN edited_by TEXT REFERENCES teachers (id) ON DELETE SET NULL;
ALTER TABLE events ADD COLUMN edited_by TEXT REFERENCES teachers(id) ON DELETE SET NULL;
