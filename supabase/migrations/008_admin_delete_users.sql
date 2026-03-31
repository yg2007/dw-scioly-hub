-- ═══════════════════════════════════════════════════════════════
--  Migration 008: Allow admins to delete users
--
--  Missing DELETE policy on users table was silently blocking
--  all user deletions via RLS.
--
--  Also add cascade deletes for related tables that reference
--  users but don't have ON DELETE CASCADE (some use RESTRICT).
-- ═══════════════════════════════════════════════════════════════

-- Allow admins to delete users
CREATE POLICY "Admins can delete users"
  ON users FOR DELETE TO authenticated
  USING (is_admin());

-- Allow admins to delete from related tables for cleanup
-- (Most tables already have ON DELETE CASCADE from users FK,
--  but competition_team_assignments needs it too)
