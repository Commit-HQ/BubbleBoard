-- What BubbleBoard keeps in private R2 (src/lib/server/storage.ts), counted so an installation stays within
-- the STORAGE_* limits in .env, such as R2's free allowance. Each object is counted before its bytes are
-- stored and forgotten only after they're deleted, so the count is never less than what R2 holds. A key is
-- stored once, and `deleting` marks an object whose bytes are on their way out, which no record may name.

CREATE TABLE stored_objects (
	key TEXT PRIMARY KEY,
	bytes INTEGER NOT NULL,
	stored_at INTEGER NOT NULL,
	deleting INTEGER NOT NULL DEFAULT 0 CHECK (deleting IN (0, 1))
);

-- Uploads and downloads in each month, which R2 counts as Class A and Class B operations. Months are UTC,
-- such as '2026-09'.
CREATE TABLE storage_months (
	month TEXT PRIMARY KEY,
	uploads INTEGER NOT NULL DEFAULT 0,
	downloads INTEGER NOT NULL DEFAULT 0
);

-- The key of every object a record names. Each kind of record that keeps bytes in R2 adds its keys here, and
-- the daily cleanup deletes stored objects none of them names.
CREATE VIEW named_objects AS
SELECT 'board/' || classroom_id || '/' || id AS key FROM board_photos;
