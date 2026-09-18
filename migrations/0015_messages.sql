-- Titles and message bodies are encrypted with the family's key. Only routing and policy metadata is public.
CREATE TABLE message_settings (
 classroom_id TEXT PRIMARY KEY REFERENCES classrooms(id) ON DELETE CASCADE,
 enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN (0,1)),
 monthly_limit INTEGER NOT NULL DEFAULT 3 CHECK(monthly_limit BETWEEN 1 AND 1000),
 schedule TEXT NOT NULL,
 revision INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE conversations (
 id TEXT PRIMARY KEY,
 family_id TEXT NOT NULL,
 classroom_id TEXT NOT NULL,
 title TEXT NOT NULL,
 closed INTEGER NOT NULL DEFAULT 0 CHECK(closed IN (0,1)),
 created_at INTEGER NOT NULL,
 FOREIGN KEY(family_id,classroom_id) REFERENCES family_classrooms(family_id,classroom_id) ON DELETE CASCADE
);
CREATE INDEX conversations_family ON conversations(classroom_id,family_id);
CREATE TABLE messages (
 sequence INTEGER PRIMARY KEY AUTOINCREMENT,
 id TEXT NOT NULL UNIQUE,
 conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
 author TEXT NOT NULL,
 content TEXT NOT NULL,
 posted_at INTEGER NOT NULL,
 -- The Zagreb month whose allowance this message spent, or NULL when it was free: everything a teacher
 -- sends, and a family's answer to a teacher's message.
 charged TEXT
);
CREATE INDEX messages_conversation ON messages(conversation_id,sequence);
CREATE INDEX messages_charged ON messages(conversation_id,charged) WHERE charged IS NOT NULL;
CREATE TABLE conversation_reads (
 conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
 reader TEXT NOT NULL,
 sequence INTEGER NOT NULL,
 PRIMARY KEY(conversation_id,reader)
);
