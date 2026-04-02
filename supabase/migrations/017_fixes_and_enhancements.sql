-- ═══════════════════════════════════════════════════════════
-- 017 — Fixes & Enhancements
--
-- 1. Fix Nicole's role (student → coach)
-- 2. Add Div B trial events for 2025-2026
-- 3. RLS policies for coaches to manage events
-- ═══════════════════════════════════════════════════════════

-- ─── 1. Fix Nicole's role ───────────────────────────────────
-- Update by name since we don't have her UUID handy.
-- Safe: only updates if role is currently 'student'.
UPDATE users
SET role = 'coach', updated_at = now()
WHERE full_name ILIKE '%Nicole%'
  AND role = 'student';

-- ─── 2. Add trial events for 2025-2026 season ──────────────
-- Div B trial events — insert only if they don't already exist.
INSERT INTO events (name, type, team_size, icon, is_trial, season) VALUES
  ('Fast Facts', 'study', 3, '⚡', true, '2025-2026'),
  ('Reach for the Stars', 'study', 2, '⭐', true, '2025-2026'),
  ('Road Scholar', 'study', 2, '🗺️', true, '2025-2026')
ON CONFLICT (name) DO UPDATE SET is_trial = true;

-- ─── 3. Fix coach_dashboard_stats to only count students ────
-- The view was counting coaches assigned to events too.
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

-- ─── 4. Allow coaches to manage events ─────────────────────
-- Coaches and admins can insert new events
DROP POLICY IF EXISTS events_insert_staff ON events;
CREATE POLICY events_insert_staff ON events FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('coach', 'admin'))
  );

-- Coaches and admins can update events
DROP POLICY IF EXISTS events_update_staff ON events;
CREATE POLICY events_update_staff ON events FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('coach', 'admin'))
  );

-- Everyone can view events (should already exist, but ensure it)
DROP POLICY IF EXISTS events_select_all ON events;
CREATE POLICY events_select_all ON events FOR SELECT USING (true);

-- Enable RLS on events if not already
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Also allow coaches to manage event_topics
ALTER TABLE event_topics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS event_topics_select_all ON event_topics;
CREATE POLICY event_topics_select_all ON event_topics FOR SELECT USING (true);

DROP POLICY IF EXISTS event_topics_insert_staff ON event_topics;
CREATE POLICY event_topics_insert_staff ON event_topics FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('coach', 'admin'))
  );

DROP POLICY IF EXISTS event_topics_update_staff ON event_topics;
CREATE POLICY event_topics_update_staff ON event_topics FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('coach', 'admin'))
  );

DROP POLICY IF EXISTS event_topics_delete_staff ON event_topics;
CREATE POLICY event_topics_delete_staff ON event_topics FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('coach', 'admin'))
  );
