-- ═══════════════════════════════════════════════════════════════
--  Migration 018: Security Fixes
--
--  Resolves 5 Supabase linter errors:
--
--  1. coach_dashboard_stats view — SECURITY DEFINER → INVOKER
--  2. team_roster view — SECURITY DEFINER → INVOKER
--  3. question_schedule table — enable RLS + policies
--  4. question_review_queue table — enable RLS + policies
--  5. ingestion_log table — enable RLS + policies
--
--  All views are recreated with security_invoker = true so they
--  respect the querying user's RLS policies instead of the
--  view creator's (superuser) permissions.
--
--  All tables get RLS enabled with staff-only access for admin
--  tables and user-scoped access for question_schedule.
-- ═══════════════════════════════════════════════════════════════


-- ─── 1. Fix coach_dashboard_stats view ────────────────────────
-- Recreate with security_invoker = true

DROP VIEW IF EXISTS coach_dashboard_stats;

CREATE VIEW coach_dashboard_stats
WITH (security_invoker = true)
AS
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
LEFT JOIN user_events ue ON ue.event_id = e.id
  AND EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = ue.user_id
      AND u.role = 'student'
      AND (u.is_alumni = false OR u.is_alumni IS NULL)
  )
LEFT JOIN quiz_attempts qa ON qa.event_id = e.id
LEFT JOIN build_logs     bl ON bl.event_id = e.id
GROUP BY e.id, e.name, e.type;


-- ─── 2. Fix team_roster view ──────────────────────────────────
-- Recreate with security_invoker = true

DROP VIEW IF EXISTS team_roster;

CREATE VIEW team_roster
WITH (security_invoker = true)
AS
SELECT
  u.id,
  u.email,
  u.full_name,
  u.initials,
  u.role,
  u.avatar_color,
  u.created_at,
  ARRAY_AGG(DISTINCT ue.event_id) FILTER (WHERE ue.event_id IS NOT NULL) AS event_ids,
  'active' AS status
FROM users u
LEFT JOIN user_events ue ON ue.user_id = u.id
GROUP BY u.id, u.email, u.full_name, u.initials, u.role, u.avatar_color, u.created_at

UNION ALL

SELECT
  NULL AS id,
  i.email,
  i.full_name,
  NULL AS initials,
  i.role,
  NULL AS avatar_color,
  i.created_at,
  i.event_ids,
  i.status::text
FROM invitations i
WHERE i.status = 'pending';


-- ─── 3. Enable RLS on question_schedule ───────────────────────
-- This is per-user spaced repetition data — users see only their own rows,
-- staff can see all.

ALTER TABLE question_schedule ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own schedule" ON question_schedule;
CREATE POLICY "Users can view own schedule"
  ON question_schedule FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can manage own schedule" ON question_schedule;
CREATE POLICY "Users can manage own schedule"
  ON question_schedule FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Staff can view all schedules" ON question_schedule;
CREATE POLICY "Staff can view all schedules"
  ON question_schedule FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('coach', 'admin')
    )
  );


-- ─── 4. Enable RLS on question_review_queue ───────────────────
-- This is a staff-only admin table for reviewing flagged questions.

ALTER TABLE question_review_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can manage review queue" ON question_review_queue;
CREATE POLICY "Staff can manage review queue"
  ON question_review_queue FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('coach', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('coach', 'admin')
    )
  );


-- ─── 5. Enable RLS on ingestion_log ──────────────────────────
-- This is a staff-only read log of imported question sets.

ALTER TABLE ingestion_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view ingestion log" ON ingestion_log;
CREATE POLICY "Staff can view ingestion log"
  ON ingestion_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('coach', 'admin')
    )
  );

DROP POLICY IF EXISTS "Staff can manage ingestion log" ON ingestion_log;
CREATE POLICY "Staff can manage ingestion log"
  ON ingestion_log FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('coach', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('coach', 'admin')
    )
  );
