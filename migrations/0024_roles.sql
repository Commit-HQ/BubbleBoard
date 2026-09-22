-- What a staff member may do. A teacher posts in the classrooms she's assigned to; a group lead also runs
-- the children, family cards and messaging of those classrooms; the head of the kindergarten runs
-- everything, everywhere, so she's assigned to no classroom at all and instead hears about every classroom
-- except the ones she mutes, which keeps a new classroom audible without anyone remembering to tick it.

ALTER TABLE teachers ADD COLUMN role TEXT NOT NULL DEFAULT 'teacher'
	CHECK (role IN ('teacher', 'lead', 'head'));

UPDATE teachers SET role = 'head' WHERE admin = 1;

-- The triggers read the column that's going, so they go with it and come back reading the role.
DROP TRIGGER keep_an_admin_after_update;

DROP TRIGGER keep_an_admin_after_delete;

ALTER TABLE teachers DROP COLUMN admin;

-- Once set up, the installation keeps at least one head. Starting over deletes the installation first.
CREATE TRIGGER keep_a_head_after_update AFTER UPDATE OF role ON teachers
WHEN EXISTS (SELECT 1 FROM installation) AND NOT EXISTS (SELECT 1 FROM teachers WHERE role = 'head')
BEGIN
	SELECT RAISE(ABORT, 'last-head');
END;

CREATE TRIGGER keep_a_head_after_delete AFTER DELETE ON teachers
WHEN EXISTS (SELECT 1 FROM installation) AND NOT EXISTS (SELECT 1 FROM teachers WHERE role = 'head')
BEGIN
	SELECT RAISE(ABORT, 'last-head');
END;

-- The classrooms a head chose not to hear about. Only heads have rows here.
CREATE TABLE teacher_muted_classrooms (
	teacher_id TEXT NOT NULL REFERENCES teachers (id) ON DELETE CASCADE,
	classroom_id TEXT NOT NULL REFERENCES classrooms (id) ON DELETE CASCADE,
	PRIMARY KEY (teacher_id, classroom_id)
);

CREATE INDEX teacher_muted_classrooms_by_classroom ON teacher_muted_classrooms (classroom_id);

-- A head who taught some classrooms heard only about those, so the classrooms she didn't teach start muted.
-- One who taught none heard about none, but silence nobody asked for is worse than a notification, so she
-- now hears about all of them.
INSERT INTO teacher_muted_classrooms (teacher_id, classroom_id)
SELECT t.id, c.id FROM teachers t, classrooms c
WHERE t.role = 'head'
AND EXISTS (SELECT 1 FROM teacher_classrooms WHERE teacher_id = t.id)
AND c.id NOT IN (SELECT classroom_id FROM teacher_classrooms WHERE teacher_id = t.id);

DELETE FROM teacher_classrooms WHERE teacher_id IN (SELECT id FROM teachers WHERE role = 'head');
