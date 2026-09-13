-- Files attached to notices (src/lib/server/notices.ts). A file's name and key are inside its notice's
-- encrypted content; the server knows which notice each file belongs to, and its size (stored_objects). Its
-- encrypted bytes are in R2 under `notices/<notice>/<file>`, and go with the notice.

CREATE TABLE notice_files (
	notice_id TEXT NOT NULL REFERENCES notices (id) ON DELETE CASCADE,
	id TEXT NOT NULL,
	PRIMARY KEY (notice_id, id)
);

-- A notice names only files uploaded for it and not on their way out, checked in the change that names them,
-- so a file deleted at the same moment can't stay named without its bytes.
CREATE TRIGGER notice_files_stored BEFORE INSERT ON notice_files
WHEN NOT EXISTS (
	SELECT 1 FROM stored_objects
	WHERE key = 'notices/' || NEW.notice_id || '/' || NEW.id AND deleting = 0
)
BEGIN
	SELECT RAISE(ABORT, 'stale');
END;

DROP VIEW named_objects;

CREATE VIEW named_objects AS
SELECT 'board/' || classroom_id || '/' || id AS key FROM board_photos
UNION ALL
SELECT 'notices/' || notice_id || '/' || id FROM notice_files;
