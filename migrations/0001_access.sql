-- Access records, as docs/access-format.md describes. Names, and which families a child belongs to, exist
-- only inside the encrypted profiles. Record IDs are random and generated in the browser.

-- One row, written by the first setup, so a second setup can't succeed. `revision` counts changes to
-- teachers, children, and family cards (see the catalog_revision trigger).
CREATE TABLE installation (
	id INTEGER PRIMARY KEY CHECK (id = 1),
	set_up_at INTEGER NOT NULL,
	revision INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE classrooms (
	id TEXT PRIMARY KEY,
	profile TEXT NOT NULL,
	group_key_for_staff TEXT NOT NULL
);

CREATE TABLE teachers (
	id TEXT PRIMARY KEY,
	admin INTEGER NOT NULL CHECK (admin IN (0, 1)),
	profile TEXT NOT NULL
);

CREATE TABLE teacher_classrooms (
	teacher_id TEXT NOT NULL REFERENCES teachers (id) ON DELETE CASCADE,
	classroom_id TEXT NOT NULL REFERENCES classrooms (id) ON DELETE CASCADE,
	PRIMARY KEY (teacher_id, classroom_id)
);

CREATE TABLE families (
	id TEXT PRIMARY KEY,
	profile TEXT NOT NULL,
	family_key_for_staff TEXT NOT NULL
);

-- No cascade: a classroom with children can't be deleted.
CREATE TABLE children (
	id TEXT PRIMARY KEY,
	classroom_id TEXT NOT NULL REFERENCES classrooms (id),
	profile TEXT NOT NULL
);

-- The classrooms a family's children are in, each with the classroom's Group Key for that family.
CREATE TABLE family_classrooms (
	family_id TEXT NOT NULL REFERENCES families (id) ON DELETE CASCADE,
	classroom_id TEXT NOT NULL REFERENCES classrooms (id) ON DELETE CASCADE,
	group_key_for_family TEXT NOT NULL,
	PRIMARY KEY (family_id, classroom_id)
);

-- A card of a teacher or a family. The hash is the SHA-256 of the auth token's bytes, in base64url.
CREATE TABLE credentials (
	id TEXT PRIMARY KEY,
	teacher_id TEXT REFERENCES teachers (id) ON DELETE CASCADE,
	family_id TEXT REFERENCES families (id) ON DELETE CASCADE,
	auth_token_hash TEXT NOT NULL UNIQUE,
	wrapped_key TEXT NOT NULL,
	CHECK ((teacher_id IS NULL) <> (family_id IS NULL))
);

-- A connected device. The hash is the SHA-256 of the session cookie's token bytes.
CREATE TABLE sessions (
	token_hash TEXT PRIMARY KEY,
	credential_id TEXT NOT NULL REFERENCES credentials (id) ON DELETE CASCADE,
	expires_at INTEGER NOT NULL
);

CREATE INDEX teacher_classrooms_by_classroom ON teacher_classrooms (classroom_id);
CREATE INDEX children_by_classroom ON children (classroom_id);
CREATE INDEX family_classrooms_by_classroom ON family_classrooms (classroom_id);
CREATE INDEX credentials_by_teacher ON credentials (teacher_id);
CREATE INDEX credentials_by_family ON credentials (family_id);
CREATE INDEX sessions_by_credential ON sessions (credential_id);

-- Once set up, the installation keeps at least one admin. Starting over deletes the installation first.
CREATE TRIGGER keep_an_admin_after_update AFTER UPDATE OF admin ON teachers
WHEN EXISTS (SELECT 1 FROM installation) AND NOT EXISTS (SELECT 1 FROM teachers WHERE admin = 1)
BEGIN
	SELECT RAISE(ABORT, 'last-admin');
END;

CREATE TRIGGER keep_an_admin_after_delete AFTER DELETE ON teachers
WHEN EXISTS (SELECT 1 FROM installation) AND NOT EXISTS (SELECT 1 FROM teachers WHERE admin = 1)
BEGIN
	SELECT RAISE(ABORT, 'last-admin');
END;

-- A change to a teacher, children, or family cards starts by moving the revision on from the one its
-- device read. Only one change can do that, so a change made from outdated records fails instead of
-- undoing another.
CREATE TRIGGER catalog_revision BEFORE UPDATE OF revision ON installation
WHEN NEW.revision <> OLD.revision + 1
BEGIN
	SELECT RAISE(ABORT, 'stale');
END;
