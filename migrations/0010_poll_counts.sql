-- Polls whose counts families see (src/lib/server/notices.ts). Such a poll holds a key inside its notice's
-- encrypted content, and each family's answer is encrypted with that key instead of the family's own, so every
-- family that opens the notice can count the answers. The server knows only which polls show their counts, and
-- sends those polls' answers to the notice's families too. Changing it removes the answers given so far.

ALTER TABLE notices ADD COLUMN poll_counts INTEGER NOT NULL DEFAULT 0 CHECK (poll_counts IN (0, 1));
