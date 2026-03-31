-- ════════════════════════════════════════════════════════════════
--  Migration 013: Alumni Status
--
--  Adds is_alumni flag to the users table so graduating students
--  can be marked inactive without losing their history.
--
--  Alumni users:
--    - Retain all quiz history, mastery data, and build logs
--    - Can still log in (auth record untouched)
--    - Are excluded from active rosters, event assignments,
--      and coach dashboard active counts
--    - Appear in a dedicated "Alumni" tab in Team Management
--
--  Run this in Supabase SQL Editor.
-- ════════════════════════════════════════════════════════════════

-- ─── Step 1: Add is_alumni column ─────────────────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_alumni BOOLEAN NOT NULL DEFAULT false;

-- ─── Step 2: Index for fast active-roster queries ─────────────
CREATE INDEX IF NOT EXISTS idx_users_is_alumni
  ON users (is_alumni);

-- ─── Step 3: Rebuild coach_dashboard_stats to exclude alumni ──
-- The original view (from 001_initial_schema.sql) counts ALL assigned
-- students including alumni. We drop and recreate it so that
-- assigned_students only reflects active (non-alumni) students.
--
-- Column structure is intentionally preserved so CoachDashboard.jsx
-- continues to work without any app-side changes:
--   event_id, event_name, event_type, assigned_students,
--   avg_quiz_score, total_quiz_attempts, total_build_logs, last_quiz_activity
DROP VIEW IF EXISTS coach_dashboard_stats;

CREATE VIEW coach_dashboard_stats AS
SELECT
  e.id                                                               AS event_id,
  e.name                                                             AS event_name,
  e.type                                                             AS event_type,
  COUNT(DISTINCT ue.user_id)                                         AS assigned_students,
  COALESCE(AVG(qa.score::NUMERIC / NULLIF(qa.total, 0) * 100), 0)   AS avg_quiz_score,
  COUNT(DISTINCT qa.id)                                              AS total_quiz_attempts,
  COUNT(DISTINCT bl.id)                                              AS total_build_logs,
  MAX(qa.completed_at)                                               AS last_quiz_activity
FROM events e
-- only count active (non-alumni) students in the assignment totals
LEFT JOIN user_events ue ON ue.event_id = e.id
  AND EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = ue.user_id
      AND u.is_alumni = false
  )
LEFT JOIN quiz_attempts qa ON qa.event_id = e.id
LEFT JOIN build_logs     bl ON bl.event_id = e.id
GROUP BY e.id, e.name, e.type;

-- ─── Verification ──────────────────────────────────────────────
SELECT
  is_alumni,
  COUNT(*) AS user_count
FROM users
GROUP BY is_alumni
ORDER BY is_alumni;
