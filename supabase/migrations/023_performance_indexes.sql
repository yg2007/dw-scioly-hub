-- ═══════════════════════════════════════════════════════════════
--  Migration 023: Performance indexes for common query patterns
--
--  Addresses "Request timed out" issues on the free Supabase tier
--  by adding indexes for the most frequently queried columns.
-- ═══════════════════════════════════════════════════════════════

-- Quiz questions: filtered by event + difficulty + question_type in quizzes & browser
CREATE INDEX IF NOT EXISTS idx_quiz_questions_event_difficulty
  ON quiz_questions (event_id, difficulty);

CREATE INDEX IF NOT EXISTS idx_quiz_questions_event_type
  ON quiz_questions (event_id, question_type);

-- Quiz attempts: filtered by user+event (student quiz history) and by completed_at (dashboard)
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_event
  ON quiz_attempts (user_id, event_id);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_completed_at
  ON quiz_attempts (completed_at DESC)
  WHERE completed_at IS NOT NULL;

-- Topic mastery: queried per-user and per-event constantly
CREATE INDEX IF NOT EXISTS idx_topic_mastery_user
  ON topic_mastery (user_id);

CREATE INDEX IF NOT EXISTS idx_topic_mastery_event
  ON topic_mastery (event_id);

-- Users: filtered by role in many coach queries
CREATE INDEX IF NOT EXISTS idx_users_role
  ON users (role);

-- Partnerships: filtered by status + partner columns in Synergy page
CREATE INDEX IF NOT EXISTS idx_partnerships_status
  ON partnerships (status);

CREATE INDEX IF NOT EXISTS idx_partnerships_partner_a
  ON partnerships (partner_a);

CREATE INDEX IF NOT EXISTS idx_partnerships_partner_b
  ON partnerships (partner_b);

-- Question review queue: filtered by reviewed status
CREATE INDEX IF NOT EXISTS idx_review_queue_reviewed
  ON question_review_queue (reviewed)
  WHERE reviewed = false;

-- Announcements: frequently ordered by created_at
CREATE INDEX IF NOT EXISTS idx_announcements_active
  ON announcements (created_at DESC);

-- Build logs: queried by user + event
CREATE INDEX IF NOT EXISTS idx_build_logs_user_event
  ON build_logs (user_id, event_id);
