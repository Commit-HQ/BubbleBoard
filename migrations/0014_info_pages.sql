-- Info pages (src/lib/server/info.ts): the kindergarten's info becomes pages, each on its paper with files of its
-- own, in the order admins put them in. The Info Key stays as 0013_info.sql made it, in `info` and each classroom's
-- `info_key`, and encrypts every page. The single page before goes, with its files: it held only text to try it
-- out, and its content wasn't tied to a page.

-- The single page's files go on their way out, and a later change or the daily cleanup deletes their bytes.
DROP VIEW named_objects;
DELETE FROM info_files;
DROP TRIGGER info_files_stored;
DROP TRIGGER info_files_leaving;
DROP TABLE info_files;

-- `info` keeps only the Info Key.
ALTER TABLE info DROP COLUMN content;
ALTER TABLE info DROP COLUMN edited_at;

-- A page. Its text, paper, and files' names and keys exist only inside `content`, encrypted with the Info Key.
-- `position` orders the pages, lowest first.
CREATE TABLE info_pages (
	id TEXT PRIMARY KEY,
	content TEXT NOT NULL,
	position INTEGER NOT NULL,
	edited_at INTEGER NOT NULL
);

-- A page is saved only once there's an Info Key, which the kindergarten's first page brings.
CREATE TRIGGER info_pages_keyed BEFORE INSERT ON info_pages
WHEN NOT EXISTS (SELECT 1 FROM info)
BEGIN
	SELECT RAISE(ABORT, 'stale');
END;

-- A page's files. Their names and keys are inside its content, and their encrypted bytes in R2 under
-- `info/<page>/<file>`, which go with the page.
CREATE TABLE info_files (
	page_id TEXT NOT NULL REFERENCES info_pages (id) ON DELETE CASCADE,
	id TEXT NOT NULL,
	PRIMARY KEY (page_id, id)
);

-- A page names only files uploaded for it and not on their way out, as a notice does (0008_notice_files.sql).
CREATE TRIGGER info_files_stored BEFORE INSERT ON info_files
WHEN NOT EXISTS (
	SELECT 1 FROM stored_objects
	WHERE key = 'info/' || NEW.page_id || '/' || NEW.id AND deleting = 0
)
BEGIN
	SELECT RAISE(ABORT, 'stale');
END;

-- A file goes on its way out with its row, however it goes: left out by a change, or deleted with its page.
CREATE TRIGGER info_files_leaving AFTER DELETE ON info_files
BEGIN
	UPDATE stored_objects SET deleting = 1 WHERE key = 'info/' || OLD.page_id || '/' || OLD.id;
END;

CREATE VIEW named_objects AS
SELECT 'board/' || classroom_id || '/' || id AS key FROM board_photos
UNION ALL
SELECT 'notices/' || notice_id || '/' || id FROM notice_files
UNION ALL
SELECT 'info/' || page_id || '/' || id FROM info_files;
