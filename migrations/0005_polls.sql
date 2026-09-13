-- Polls on notices (src/lib/server/notices.ts). A poll's answers are words inside the notice's encrypted
-- content, so the server knows only whether a notice has one. Each family's answer is encrypted with its
-- Family Key, which only that family and staff hold, and it goes when the poll is taken off the notice.

ALTER TABLE notices ADD COLUMN poll INTEGER NOT NULL DEFAULT 0 CHECK (poll IN (0, 1));

CREATE TABLE poll_votes (
	notice_id TEXT NOT NULL REFERENCES notices (id) ON DELETE CASCADE,
	family_id TEXT NOT NULL REFERENCES families (id) ON DELETE CASCADE,
	choice TEXT NOT NULL,
	PRIMARY KEY (notice_id, family_id)
);

CREATE INDEX poll_votes_by_family ON poll_votes (family_id);
