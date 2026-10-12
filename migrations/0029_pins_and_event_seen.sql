-- When a teacher pinned a notice to the top of the board, or nothing while it isn't pinned. Pinned notices
-- come first, the most recently pinned on top; the rest of the board stays newest first.
ALTER TABLE notices ADD COLUMN pinned_at INTEGER;

-- Events families marked as seen, as notice_seen holds for notices: a tap, never a record of who opened what.
CREATE TABLE event_seen (
	event_id TEXT NOT NULL REFERENCES events (id) ON DELETE CASCADE,
	family_id TEXT NOT NULL REFERENCES families (id) ON DELETE CASCADE,
	PRIMARY KEY (event_id, family_id)
);

CREATE INDEX event_seen_by_family ON event_seen (family_id);
