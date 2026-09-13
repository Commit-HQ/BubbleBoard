-- Who put a board photo up (src/lib/server/photos.ts): the teacher's name, encrypted with the classroom's Group
-- Key, so the classroom's families see it as they see a notice's author. Photos put up before have none.

ALTER TABLE board_photos ADD COLUMN details TEXT;
