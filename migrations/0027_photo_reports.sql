-- A family's report of an event's photos is an inquiry that names the event. The server learns which family
-- reported which event, which the owner accepted, and nothing of which photos or why: the photos are sealed
-- with the report's subject, and the why is its first message. A family reports an event once. The event
-- isn't a foreign key, because the report stays with its family, as any inquiry does, after the event
-- expires or is removed.
ALTER TABLE conversations ADD COLUMN event_id TEXT;
CREATE UNIQUE INDEX conversations_report ON conversations(family_id,event_id) WHERE event_id IS NOT NULL;
