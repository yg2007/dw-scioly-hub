-- ═══════════════════════════════════════════════════════════════
--  Migration 014: Practice Pairings Mode
--
--  Coaches can create "practice" pairings alongside the exclusive
--  "competition" lineup. In practice mode, the same student can
--  appear in multiple groups within the same event so coaches can
--  compare different configurations.
--
--  Competition pairings remain exclusive (one team per student per
--  event) and are the ones that get finalized/announced.
-- ═══════════════════════════════════════════════════════════════

CREATE TYPE partnership_mode AS ENUM ('competition', 'practice');

ALTER TABLE partnerships
  ADD COLUMN mode partnership_mode NOT NULL DEFAULT 'competition';

-- Existing partnerships are all competition pairings
UPDATE partnerships SET mode = 'competition';

-- Drop the old UNIQUE constraint so practice pairings can re-use students.
-- We'll enforce competition exclusivity at the application level instead.
-- The original constraint was: UNIQUE(event_id, partner_a, partner_b)
ALTER TABLE partnerships DROP CONSTRAINT IF EXISTS partnerships_event_id_partner_a_partner_b_key;

-- Add a partial unique constraint ONLY for competition pairings:
-- Within a single event's competition lineup, each pairwise partnership
-- must still be unique.
CREATE UNIQUE INDEX uq_competition_partnership
  ON partnerships (event_id, partner_a, partner_b)
  WHERE mode = 'competition';

-- Index for fast mode-filtered queries
CREATE INDEX idx_partnerships_mode ON partnerships (mode);
