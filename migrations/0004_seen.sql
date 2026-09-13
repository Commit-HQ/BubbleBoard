-- Notices families marked as seen (src/lib/server/notices.ts), which their teachers see. A family marks a
-- notice with a tap; nothing records who opened what. A change that notifies everyone again clears the
-- notice's marks.

CREATE TABLE notice_seen (
	notice_id TEXT NOT NULL REFERENCES notices (id) ON DELETE CASCADE,
	family_id TEXT NOT NULL REFERENCES families (id) ON DELETE CASCADE,
	PRIMARY KEY (notice_id, family_id)
);

CREATE INDEX notice_seen_by_family ON notice_seen (family_id);
