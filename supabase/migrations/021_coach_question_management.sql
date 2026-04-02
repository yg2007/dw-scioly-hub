-- ═══════════════════════════════════════════════════════════════
--  Migration 021: Enable coach question management via RLS
--
--  Allows coaches and admins to INSERT, UPDATE, and DELETE
--  quiz_questions directly from the Question Bank UI.
--  Students retain read-only access for quizzes.
-- ═══════════════════════════════════════════════════════════════


-- ─── 1. Enable RLS on quiz_questions (if not already) ─────────
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;


-- ─── 2. Students can read all questions (for quizzes) ─────────
DROP POLICY IF EXISTS "Students can read questions" ON quiz_questions;
CREATE POLICY "Students can read questions"
  ON quiz_questions FOR SELECT
  TO authenticated
  USING (true);


-- ─── 3. Coaches/admins can insert questions ───────────────────
DROP POLICY IF EXISTS "Staff can insert questions" ON quiz_questions;
CREATE POLICY "Staff can insert questions"
  ON quiz_questions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND role IN ('coach', 'admin')
    )
  );


-- ─── 4. Coaches/admins can update questions ───────────────────
DROP POLICY IF EXISTS "Staff can update questions" ON quiz_questions;
CREATE POLICY "Staff can update questions"
  ON quiz_questions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND role IN ('coach', 'admin')
    )
  );


-- ─── 5. Coaches/admins can delete questions ───────────────────
DROP POLICY IF EXISTS "Staff can delete questions" ON quiz_questions;
CREATE POLICY "Staff can delete questions"
  ON quiz_questions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND role IN ('coach', 'admin')
    )
  );


-- ─── 6. Same policies for ingestion_log inserts ──────────────
--    (018 already has SELECT + ALL for staff, but we need
--     INSERT specifically for the import tool)
DROP POLICY IF EXISTS "Staff can insert ingestion log" ON ingestion_log;
CREATE POLICY "Staff can insert ingestion log"
  ON ingestion_log FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND role IN ('coach', 'admin')
    )
  );
