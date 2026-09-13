-- The photo of each classroom's board (src/lib/server/photos.ts): a teacher photographs the corkboard, and
-- the classroom's families see it until a new photo takes its place or it's taken down. The photo is
-- encrypted with the classroom's Group Key and kept in R2 under `board/<classroom>/<photo>`; this table names
-- the photo each classroom shows.

CREATE TABLE board_photos (
	classroom_id TEXT PRIMARY KEY REFERENCES classrooms (id) ON DELETE CASCADE,
	id TEXT NOT NULL UNIQUE,
	posted_at INTEGER NOT NULL
);
