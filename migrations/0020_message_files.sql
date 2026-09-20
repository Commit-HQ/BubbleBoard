-- Files a teacher attaches to a private inquiry (src/lib/server/messages.ts). A file's name and key are inside
-- its message's encrypted content, as a notice's are, so whoever opens the message opens its files. The server
-- knows which message carries which file and its size (stored_objects); its encrypted bytes are in R2 under
-- `messages/<message>/<file>` and go with the message. Families attach nothing: only staff upload.

CREATE TABLE message_files (
	message_id TEXT NOT NULL REFERENCES messages (id) ON DELETE CASCADE,
	id TEXT NOT NULL,
	PRIMARY KEY (message_id, id)
);

-- A message names only files uploaded for it and not on their way out, checked in the change that names them.
CREATE TRIGGER message_files_stored BEFORE INSERT ON message_files
WHEN NOT EXISTS (
	SELECT 1 FROM stored_objects
	WHERE key = 'messages/' || NEW.message_id || '/' || NEW.id AND deleting = 0
)
BEGIN
	SELECT RAISE(ABORT, 'stale');
END;

CREATE TRIGGER message_files_leaving AFTER DELETE ON message_files
BEGIN
	UPDATE stored_objects SET deleting = 1 WHERE key = 'messages/' || OLD.message_id || '/' || OLD.id;
END;

DROP VIEW named_objects;

CREATE VIEW named_objects AS
SELECT 'board/' || classroom_id || '/' || id AS key FROM board_photos
UNION ALL
SELECT 'notices/' || notice_id || '/' || id FROM notice_files
UNION ALL
SELECT 'info/' || page_id || '/' || id FROM info_files
UNION ALL
SELECT 'events/' || event_id || '/' || id FROM event_files
UNION ALL
SELECT 'messages/' || message_id || '/' || id FROM message_files;
