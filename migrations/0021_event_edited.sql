-- When an event was last changed after it went up, as `edited_at` marks a changed notice. An event that has
-- never been changed keeps it empty, and the card says nothing.
ALTER TABLE events ADD COLUMN edited_at INTEGER;
