-- Empties every record so the first setup can run again (docs/hosting.md).
-- Everything stored is lost, and every card stops working. Board photos and the files of notices and info pages
-- stay in R2, where nothing can open them without the old keys, until the daily cleanup deletes them, since no
-- record names them anymore. The installation row goes first: once it's gone, the database no longer insists on
-- keeping a head of the kindergarten.
DELETE FROM installation;
DELETE FROM notices;
DELETE FROM info_pages;
DELETE FROM info;
DELETE FROM sessions;
DELETE FROM credentials;
DELETE FROM family_classrooms;
DELETE FROM teacher_classrooms;
DELETE FROM children;
DELETE FROM families;
DELETE FROM teachers;
DELETE FROM classrooms;
