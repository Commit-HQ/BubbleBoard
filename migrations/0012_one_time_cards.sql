-- One-time cards (src/lib/server/catalog.ts): a family's device makes one to connect another of the family's
-- devices without the printed card. It connects a single device until `connects_until`, which connecting sets
-- to 0, and the device it connected keeps its session. Printed cards have none and connect any number of devices.

ALTER TABLE credentials ADD COLUMN connects_until INTEGER;
