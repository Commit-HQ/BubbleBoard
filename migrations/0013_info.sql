-- The kindergarten's info page (src/lib/server/info.ts): text and files for everyone who uses the app, which admins
-- write and which stays until they change it. Its text, and its files' names and keys, exist only inside `content`,
-- encrypted with the page's Info Key. The key is made when the page is first saved and never changes:
-- `info_key_for_staff` holds it wrapped with the Staff Key, and each classroom's `info_key` wrapped with the
-- classroom's Group Key, which families open it with.

CREATE TABLE info (
	id INTEGER PRIMARY KEY CHECK (id = 1),
	content TEXT NOT NULL,
	info_key_for_staff TEXT NOT NULL,
	edited_at INTEGER NOT NULL
);

ALTER TABLE classrooms ADD COLUMN info_key TEXT;

-- The first save stores the key for each classroom, then the page, which is refused when a page was saved first or a
-- classroom would be left without the key: the device didn't know about them, and loads its records again.
CREATE TRIGGER info_for_every_classroom BEFORE INSERT ON info
WHEN EXISTS (SELECT 1 FROM info) OR EXISTS (SELECT 1 FROM classrooms WHERE info_key IS NULL)
BEGIN
	SELECT RAISE(ABORT, 'stale');
END;

-- Once there's a page, a new classroom comes with the key, and until then without one.
CREATE TRIGGER classrooms_info_key BEFORE INSERT ON classrooms
WHEN (NEW.info_key IS NULL) = EXISTS (SELECT 1 FROM info)
BEGIN
	SELECT RAISE(ABORT, 'stale');
END;

-- The page's files. Their names and keys are inside its content, and their encrypted bytes in R2 under
-- `info/<file>`.
CREATE TABLE info_files (
	id TEXT PRIMARY KEY
);

-- The page names only files uploaded for it and not on their way out, as a notice does (0008_notice_files.sql).
CREATE TRIGGER info_files_stored BEFORE INSERT ON info_files
WHEN NOT EXISTS (SELECT 1 FROM info) OR NOT EXISTS (
	SELECT 1 FROM stored_objects WHERE key = 'info/' || NEW.id AND deleting = 0
)
BEGIN
	SELECT RAISE(ABORT, 'stale');
END;

-- A file the page leaves out goes on its way out with its row (0009_storage_marks.sql).
CREATE TRIGGER info_files_leaving AFTER DELETE ON info_files
BEGIN
	UPDATE stored_objects SET deleting = 1 WHERE key = 'info/' || OLD.id;
END;

DROP VIEW named_objects;

CREATE VIEW named_objects AS
SELECT 'board/' || classroom_id || '/' || id AS key FROM board_photos
UNION ALL
SELECT 'notices/' || notice_id || '/' || id FROM notice_files
UNION ALL
SELECT 'info/' || id FROM info_files;
