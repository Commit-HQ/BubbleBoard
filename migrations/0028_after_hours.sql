-- Whether a teacher's message went out while the classroom's families couldn't write: outside its sending
-- hours, which the server decides as it stores the message. The family may answer such a message at any time,
-- since the teacher chose to write then; its answer, and anything after, keeps the hours again. A family's
-- message, and a teacher's sent within the hours, keep it empty.
ALTER TABLE messages ADD COLUMN after_hours INTEGER NOT NULL DEFAULT 0 CHECK(after_hours IN (0,1));
