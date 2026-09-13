-- An object goes on its way out in the change that removes the record naming it (src/lib/server/storage.ts),
-- however the record goes: left out by a change, taken down, or deleted with its notice or classroom. The change
-- then deletes the objects it marked, and the daily cleanup those whose deletion didn't finish.

CREATE TRIGGER notice_files_leaving AFTER DELETE ON notice_files
BEGIN
	UPDATE stored_objects SET deleting = 1 WHERE key = 'notices/' || OLD.notice_id || '/' || OLD.id;
END;

CREATE TRIGGER board_photos_leaving AFTER DELETE ON board_photos
BEGIN
	UPDATE stored_objects SET deleting = 1 WHERE key = 'board/' || OLD.classroom_id || '/' || OLD.id;
END;

-- The objects on their way out, which each change looks up once it's saved.
CREATE INDEX stored_objects_deleting ON stored_objects (key) WHERE deleting;
