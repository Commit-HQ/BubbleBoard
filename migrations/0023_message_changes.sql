-- When a message of a private inquiry was last changed, and when it was deleted. A deleted message keeps its
-- row, so ordering, sequences, and both sides' read progress stay as they were; its `content` is emptied and
-- its files go, and the app shows the placeholder in its place. A message nobody changed keeps both empty.
ALTER TABLE messages ADD COLUMN edited_at INTEGER;
ALTER TABLE messages ADD COLUMN deleted_at INTEGER;
