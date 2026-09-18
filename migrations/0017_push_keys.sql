-- The keys a browser made for a device's subscription (RFC 8291), which let a push carry one letter saying
-- what happened, encrypted so that the push service reads nothing. Both are empty for a device that
-- subscribed before this: the app sends them again whenever it opens, and until it does that device gets an
-- empty push, which says the same words as a notice.

ALTER TABLE push_subscriptions ADD COLUMN p256dh TEXT;
ALTER TABLE push_subscriptions ADD COLUMN auth TEXT;
