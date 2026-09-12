-- Devices that turned on notifications (src/lib/server/push.ts). The endpoint is the push service's address
-- for one device; pushes carry nothing. A subscription belongs to the session that sent it, so it ends with
-- that session: when the device signs out, its card is replaced, its teacher or family is removed, or the
-- session runs out.

CREATE TABLE push_subscriptions (
	endpoint TEXT PRIMARY KEY,
	session_hash TEXT NOT NULL REFERENCES sessions (token_hash) ON DELETE CASCADE
);

CREATE INDEX push_subscriptions_by_session ON push_subscriptions (session_hash);
