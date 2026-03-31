-- ═══════════════════════════════════════════════════════════════
--  011_question_edit_audit.sql
--
--  Adds audit columns to quiz_questions so coaches can edit
--  question wording and answers inline, with a full trail of
--  who changed what and when.
--
--  Run in Supabase SQL Editor before deploying the updated app.
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE quiz_questions
  -- Who last edited this question (null = never edited)
  ADD COLUMN IF NOT EXISTS last_edited_by   UUID        REFERENCES users(id) ON DELETE SET NULL,
  -- When the last edit was made
  ADD COLUMN IF NOT EXISTS last_edited_at   TIMESTAMPTZ,
  -- Snapshot of the original question text (set on first edit, never overwritten)
  ADD COLUMN IF NOT EXISTS original_question TEXT,
  -- Snapshot of the original options array (set on first edit, never overwritten)
  ADD COLUMN IF NOT EXISTS original_options  JSONB;

-- Index for looking up questions edited by a specific coach
CREATE INDEX IF NOT EXISTS idx_quiz_questions_edited_by
  ON quiz_questions (last_edited_by)
  WHERE last_edited_by IS NOT NULL;
