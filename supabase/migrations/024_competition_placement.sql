-- ═══════════════════════════════════════════════════════════════
--  Migration 024: Add overall placement tracking to competitions
--
--  Adds overall_placement, total_teams, and total_points fields
--  so coaches can record "We placed 3rd out of 24 teams" directly
--  from the mobile Quick Score view.
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE competitions
  ADD COLUMN IF NOT EXISTS overall_placement INT,
  ADD COLUMN IF NOT EXISTS total_teams INT,
  ADD COLUMN IF NOT EXISTS total_points NUMERIC;
