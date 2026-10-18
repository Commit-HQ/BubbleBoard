-- Whether staff booked a meeting for the child's family, which that family sees on it. Every booking sets it,
-- so a time released and booked again says who booked it this time.
ALTER TABLE meeting_slots ADD COLUMN staff_booked INTEGER NOT NULL DEFAULT 0;
