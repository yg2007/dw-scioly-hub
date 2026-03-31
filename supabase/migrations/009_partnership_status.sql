-- ═══════════════════════════════════════════════════════════════
--  Migration 009: Partnership Draft/Finalized Status
--
--  Coaches can create draft pairings and experiment with different
--  configurations. Students only see finalized pairings.
--  When a pairing is finalized, students get study suggestions.
-- ═══════════════════════════════════════════════════════════════

CREATE TYPE partnership_status AS ENUM ('draft', 'finalized');

-- Add status column with default 'draft'
ALTER TABLE partnerships
  ADD COLUMN status partnership_status NOT NULL DEFAULT 'draft',
  ADD COLUMN finalized_at TIMESTAMPTZ,
  ADD COLUMN finalized_by UUID REFERENCES users(id);

-- Update existing partnerships to 'finalized' (they were created before this feature)
UPDATE partnerships SET status = 'finalized', finalized_at = now();

-- Update RLS: students can only see FINALIZED partnerships they're part of
-- First drop the old select policy
DROP POLICY IF EXISTS "Partners and staff can view partnerships" ON partnerships;

-- Staff see all partnerships (draft + finalized)
CREATE POLICY "Staff can view all partnerships"
  ON partnerships FOR SELECT TO authenticated
  USING (is_staff());

-- Students only see finalized partnerships they're part of
CREATE POLICY "Students see own finalized partnerships"
  ON partnerships FOR SELECT TO authenticated
  USING (
    status = 'finalized'
    AND (partner_a = auth.uid() OR partner_b = auth.uid())
  );
