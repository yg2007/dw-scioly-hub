-- ═══════════════════════════════════════════════════════════════
--  Migration 025: Dashboard RPCs
--  Pre-aggregated database functions for coach dashboard
--  Reduces client-side computation and improves performance
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. Dashboard Summary ─────────────────────────────────────
-- Returns overall team statistics as a single JSON object
-- Optional: filter by specific event
CREATE OR REPLACE FUNCTION get_dashboard_summary(p_event_id INT DEFAULT NULL)
RETURNS json
LANGUAGE sql
STABLE
AS $$
  SELECT json_build_object(
    'total_members', (
      SELECT count(*)
      FROM users u
      WHERE u.role = 'student'
        AND (u.is_alumni = false OR u.is_alumni IS NULL)
    ),
    'events_tracked', (
      SELECT count(*)
      FROM events
    ),
    'avg_readiness', (
      SELECT round(avg(cast(qa.score as numeric) / nullif(qa.total, 0) * 100)::numeric, 2)::float
      FROM quiz_attempts qa
      WHERE (p_event_id IS NULL OR qa.event_id = p_event_id)
        AND qa.total > 0
    ),
    'next_competition', (
      SELECT json_build_object(
        'name', c.name,
        'date', c.date,
        'days_left', cast((c.date - CURRENT_DATE) as int)
      )
      FROM competitions c
      WHERE c.date >= CURRENT_DATE
      ORDER BY c.date ASC
      LIMIT 1
    )
  );
$$;

GRANT EXECUTE ON FUNCTION get_dashboard_summary(INT) TO authenticated;

-- ─── 2. Team Progress Trend ──────────────────────────────────
-- Returns weekly aggregated quiz attempt data
-- Groups by calendar week (Monday start), returns last p_weeks weeks
CREATE OR REPLACE FUNCTION get_team_progress_trend(p_weeks INT DEFAULT 12)
RETURNS SETOF json
LANGUAGE sql
STABLE
AS $$
  WITH weekly_data AS (
    SELECT
      date_trunc('week', qa.completed_at AT TIME ZONE 'UTC' + interval '1 day')::date - interval '1 day' as week_start,
      round(avg(cast(qa.score as numeric) / nullif(qa.total, 0) * 100))::int as avg_score,
      count(*) as attempt_count
    FROM quiz_attempts qa
    WHERE qa.completed_at IS NOT NULL
      AND qa.total > 0
      AND qa.completed_at >= (CURRENT_DATE - (p_weeks || ' weeks')::interval)
    GROUP BY week_start
  )
  SELECT json_build_object(
    'week_start', wd.week_start,
    'label', to_char(wd.week_start, 'Mon DD'),
    'avg_score', wd.avg_score,
    'attempt_count', wd.attempt_count
  )
  FROM weekly_data wd
  ORDER BY wd.week_start ASC;
$$;

GRANT EXECUTE ON FUNCTION get_team_progress_trend(INT) TO authenticated;

-- ─── 3. Event Readiness Summary ───────────────────────────────
-- Returns per-event summary statistics
-- Includes quiz performance, student counts, and activity metrics
CREATE OR REPLACE FUNCTION get_event_readiness_summary()
RETURNS SETOF json
LANGUAGE sql
STABLE
AS $$
  SELECT json_build_object(
    'event_id', e.id,
    'event_name', e.name,
    'event_icon', e.icon,
    'event_type', e.type,
    'avg_quiz_score', (
      SELECT round(avg(cast(qa.score as numeric) / nullif(qa.total, 0) * 100))::int
      FROM quiz_attempts qa
      WHERE qa.event_id = e.id
    ),
    'student_count', (
      SELECT count(distinct ue.user_id)
      FROM user_events ue
      JOIN users u ON ue.user_id = u.id
      WHERE ue.event_id = e.id
        AND u.role = 'student'
        AND (u.is_alumni = false OR u.is_alumni IS NULL)
    ),
    'quiz_attempts', (
      SELECT count(*)
      FROM quiz_attempts qa
      WHERE qa.event_id = e.id
    ),
    'build_logs', (
      SELECT count(*)
      FROM build_logs bl
      WHERE bl.event_id = e.id
    )
  )
  FROM events e
  ORDER BY e.id;
$$;

GRANT EXECUTE ON FUNCTION get_event_readiness_summary() TO authenticated;

-- ─── 4. Event Student Mastery ────────────────────────────────
-- Returns per-student mastery metrics for a specific event
-- Calculates average topic mastery score
CREATE OR REPLACE FUNCTION get_event_student_mastery(p_event_id INT)
RETURNS SETOF json
LANGUAGE sql
STABLE
AS $$
  SELECT json_build_object(
    'user_id', u.id,
    'full_name', u.full_name,
    'initials', u.initials,
    'avatar_color', u.avatar_color,
    'avg_mastery', (
      SELECT round(avg(tm.score))::int
      FROM topic_mastery tm
      WHERE tm.user_id = u.id
        AND tm.event_id = p_event_id
    )
  )
  FROM users u
  JOIN user_events ue ON u.id = ue.user_id
  WHERE ue.event_id = p_event_id
    AND u.role = 'student'
    AND (u.is_alumni = false OR u.is_alumni IS NULL)
  ORDER BY u.full_name;
$$;

GRANT EXECUTE ON FUNCTION get_event_student_mastery(INT) TO authenticated;
