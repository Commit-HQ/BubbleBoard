-- Empties every record so the first setup can run again (README, "Deploy your own installation").
-- Everything stored is lost, and every card stops working. Board photos and the files of notices and the info page
-- stay in R2, where nothing can open them without the old keys, until the daily cleanup deletes them, since no
-- record names them anymore. The installation row goes first: once it's gone, the database no longer insists on
-- keeping an admin.
DELETE FROM installation;
DELETE FROM notices;
DELETE FROM info_files;
DELETE FROM info;
DELETE FROM sessions;
DELETE FROM credentials;
DELETE FROM family_classrooms;
DELETE FROM teacher_classrooms;
DELETE FROM children;
DELETE FROM families;
DELETE FROM teachers;
DELETE FROM classrooms;
