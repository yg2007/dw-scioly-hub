-- ═══════════════════════════════════════════════════════════════
--  Migration 007: Allow admins to insert users on behalf of others
--
--  The existing insert policy only allows id = auth.uid(),
--  which blocks the head coach from adding students directly.
-- ═══════════════════════════════════════════════════════════════

CREATE POLICY "Admins can insert users"
  ON users FOR INSERT TO authenticated
  WITH CHECK (is_admin());
