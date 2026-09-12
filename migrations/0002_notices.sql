-- Notices on the board, as docs/access-format.md describes. A notice's text, paper colour, and author's
-- name exist only inside `content`, encrypted with the notice's own key; `notice_classrooms` holds that
-- key wrapped with the Group Key of each classroom the notice is for.

CREATE TABLE notices (
	id TEXT PRIMARY KEY,
	-- Who posted it, which decides who may change it. A removed teacher's notices stay, for admins.
	teacher_id TEXT REFERENCES teachers (id) ON DELETE SET NULL,
	content TEXT NOT NULL,
	-- When it was first posted: the days it stays up count from here.
	posted_at INTEGER NOT NULL,
	-- When it last went to the top of the board: when posted, and at each change that announced it again.
	announced_at INTEGER NOT NULL,
	edited_at INTEGER,
	expires_at INTEGER NOT NULL
);

CREATE TABLE notice_classrooms (
	notice_id TEXT NOT NULL REFERENCES notices (id) ON DELETE CASCADE,
	classroom_id TEXT NOT NULL REFERENCES classrooms (id) ON DELETE CASCADE,
	notice_key TEXT NOT NULL,
	PRIMARY KEY (notice_id, classroom_id)
);

CREATE INDEX notice_classrooms_by_classroom ON notice_classrooms (classroom_id);
CREATE INDEX notices_by_expiry ON notices (expires_at);
