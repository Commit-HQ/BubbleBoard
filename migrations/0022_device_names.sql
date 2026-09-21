-- A family's connected devices (src/lib/server/session.ts): a family device lists the family's sessions, says who
-- uses it, and removes another. A session gets an ID of its own, because its token's hash stays on the server,
-- and a name, which the device encrypts with the Family Key, so only the family's devices read it. Staff
-- sessions have IDs too and no names.
ALTER TABLE sessions ADD COLUMN id TEXT;
ALTER TABLE sessions ADD COLUMN name TEXT;

-- Sessions from before get IDs here, since SQLite has no base64url: 21 hexadecimal characters and an A are 22
-- base64url characters that decode to 16 bytes, as the app's IDs do.
UPDATE sessions SET id = substr(lower(hex(randomblob(11))), 1, 21) || 'A';

CREATE UNIQUE INDEX sessions_by_id ON sessions (id);
