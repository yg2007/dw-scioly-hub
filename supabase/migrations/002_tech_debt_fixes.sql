-- ═══════════════════════════════════════════════════════════════════════════════════
--  Migration 002: Database Tech Debt Fixes
--  Addresses missing indexes, constraints, validation, views, and triggers
-- ═══════════════════════════════════════════════════════════════════════════════════


-- ───────────────────────────────────────────────────────────────────────────────────
--  1. MISSING INDEXES
--  Improve query performance on frequently filtered/sorted columns
-- ───────────────────────────────────────────────────────────────────────────────────

-- Quiz attempts filtered/sorted by completion date
CREATE INDEX idx_quiz_attempts_completed ON quiz_attempts(completed_at);

-- Partnership queries by event
CREATE INDEX idx_partnerships_event ON partnerships(event_id);

-- Partnership lookups by partner pair (important for duplicate detection)
CREATE INDEX idx_partnerships_partners ON partnerships(partner_a, partner_b);

-- Topic mastery sorting by recency
CREATE INDEX idx_topic_mastery_updated ON topic_mastery(updated_at);

-- Announcements listing in reverse chronological order
CREATE INDEX idx_announcements_created ON announcements(created_at DESC);


-- ───────────────────────────────────────────────────────────────────────────────────
--  2. RATE LIMITING TABLE
--  Track action frequency per user to implement rate limiting
-- ───────────────────────────────────────────────────────────────────────────────────

CREATE TABLE rate_limits (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,                 -- 'generate_quiz' | 'analyze_test' | etc.
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for efficient rate limit lookups: most recent actions per user/action combo
CREATE INDEX idx_rate_limits_user_action ON rate_limits(user_id, action, created_at DESC);

-- Enable RLS
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Users can insert their own rate limit records (system logs them on every action)
CREATE POLICY "Users can insert own rate limit records"
  ON rate_limits FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users see only their own records; staff see all
CREATE POLICY "Users see own rate limit records"
  ON rate_limits FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_staff());

-- Staff can delete old rate limit records
CREATE POLICY "Staff can manage rate limits"
  ON rate_limits FOR DELETE TO authenticated
  USING (is_staff());


-- ───────────────────────────────────────────────────────────────────────────────────
--  3. DUPLICATE QUIZ ATTEMPT PREVENTION
--  Prevent exact duplicate submissions within 5 seconds via trigger
-- ───────────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION prevent_duplicate_quiz_attempts()
RETURNS TRIGGER AS $$
DECLARE
  v_recent_count INT;
BEGIN
  -- Check if an identical attempt was created in the last 5 seconds
  SELECT COUNT(*) INTO v_recent_count
  FROM quiz_attempts
  WHERE user_id = NEW.user_id
    AND event_id = NEW.event_id
    AND score = NEW.score
    AND total = NEW.total
    AND completed_at IS NOT NULL
    AND completed_at > now() - interval '5 seconds'
    AND id != NEW.id;  -- Exclude the new record being inserted

  IF v_recent_count > 0 THEN
    RAISE EXCEPTION 'Duplicate quiz attempt detected. Please wait before resubmitting.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_quiz_attempts_dedup
  BEFORE INSERT ON quiz_attempts
  FOR EACH ROW
  EXECUTE FUNCTION prevent_duplicate_quiz_attempts();


-- ───────────────────────────────────────────────────────────────────────────────────
--  4. JSONB VALIDATION
--  Add CHECK constraints to validate JSON structure
-- ───────────────────────────────────────────────────────────────────────────────────

-- Constraint: quiz_questions.options must be a JSON array with exactly 4 elements
ALTER TABLE quiz_questions
  ADD CONSTRAINT check_quiz_options_array_length
  CHECK (
    jsonb_typeof(options) = 'array'
    AND jsonb_array_length(options) = 4
  );

-- Constraint: quiz_questions.correct_index must be 0-3 (valid index for 4 options)
ALTER TABLE quiz_questions
  ADD CONSTRAINT check_quiz_correct_index_range
  CHECK (correct_index >= 0 AND correct_index <= 3);

-- Constraint: study_paths.stage_progress must contain all 4 required stage keys
ALTER TABLE study_paths
  ADD CONSTRAINT check_study_paths_stage_keys
  CHECK (
    jsonb_typeof(stage_progress) = 'object'
    AND stage_progress ? 'foundation'
    AND stage_progress ? 'application'
    AND stage_progress ? 'mastery'
    AND stage_progress ? 'competition'
  );


-- ───────────────────────────────────────────────────────────────────────────────────
--  5. MATERIALIZED VIEW FOR PARTNER SYNERGY SCORES
--  Pre-compute partnership synergy across shared topics
-- ───────────────────────────────────────────────────────────────────────────────────

CREATE MATERIALIZED VIEW partner_synergy_scores AS
SELECT
  p.id AS partnership_id,
  p.event_id,
  p.partner_a,
  p.partner_b,
  p.created_at,
  -- Compute average of max scores across topics for the partnership
  COALESCE(
    AVG(GREATEST(
      COALESCE(tm_a.score, 0),
      COALESCE(tm_b.score, 0)
    )),
    0
  ) AS avg_max_topic_score,
  -- Count of topics where both partners have attempted
  COUNT(DISTINCT CASE WHEN tm_a.id IS NOT NULL AND tm_b.id IS NOT NULL THEN tm_a.topic END) AS shared_topics,
  -- Count of total topics covered by either partner
  COUNT(DISTINCT COALESCE(tm_a.topic, tm_b.topic)) AS total_topics_covered,
  -- Average combined score (sum of both partners' scores / 2)
  COALESCE(
    AVG((COALESCE(tm_a.score, 0) + COALESCE(tm_b.score, 0)) / 2),
    0
  ) AS avg_combined_score
FROM partnerships p
LEFT JOIN topic_mastery tm_a ON tm_a.user_id = p.partner_a
  AND tm_a.event_id = p.event_id
LEFT JOIN topic_mastery tm_b ON tm_b.user_id = p.partner_b
  AND tm_b.event_id = p.event_id
  AND tm_b.topic = tm_a.topic  -- Only match on same topic
GROUP BY p.id, p.event_id, p.partner_a, p.partner_b, p.created_at;

-- Create index on materialized view for fast lookups
CREATE INDEX idx_partner_synergy_event ON partner_synergy_scores(event_id);
CREATE INDEX idx_partner_synergy_avg_score ON partner_synergy_scores(avg_max_topic_score DESC);

-- Function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_partner_synergy_scores()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY partner_synergy_scores;
END;
$$ LANGUAGE plpgsql;


-- ───────────────────────────────────────────────────────────────────────────────────
--  6. CASCADE DELETES VERIFICATION & ADDITIONS
--  Ensure all foreign keys properly cascade on delete where appropriate
-- ───────────────────────────────────────────────────────────────────────────────────

-- Verify existing CASCADE deletes in initial schema:
-- users(id)
--   ← auth.users(id) ON DELETE CASCADE ✓
--   ← user_events(user_id) ON DELETE CASCADE ✓
--   ← partnerships(partner_a, partner_b) ON DELETE CASCADE ✓
--   ← quiz_attempts(user_id) ON DELETE CASCADE ✓
--   ← topic_mastery(user_id) ON DELETE CASCADE ✓
--   ← study_paths(user_id) ON DELETE CASCADE ✓
--   ← study_resources(uploaded_by) [optional FK, no constraint]
--   ← build_logs(user_id) ON DELETE CASCADE ✓
--   ← test_uploads(user_id) ON DELETE CASCADE ✓
--   ← practice_sessions(created_by) [optional FK, no constraint]
--   ← announcements(created_by) [optional FK, no constraint]
--   ← rate_limits(user_id) ON DELETE CASCADE ✓

-- events(id)
--   ← user_events(event_id) ON DELETE CASCADE ✓
--   ← partnerships(event_id) ON DELETE CASCADE ✓
--   ← quiz_questions(event_id) ON DELETE CASCADE ✓
--   ← quiz_attempts(event_id) ON DELETE CASCADE ✓
--   ← topic_mastery(event_id) ON DELETE CASCADE ✓
--   ← study_paths(event_id) ON DELETE CASCADE ✓
--   ← study_resources(event_id) ON DELETE CASCADE ✓
--   ← build_logs(event_id) ON DELETE CASCADE ✓
--   ← test_uploads(event_id) ON DELETE CASCADE ✓
--   ← practice_sessions(event_ids array) [Note: array foreign key doesn't enforce CASCADE]
--   ← partner_synergy_scores(event_id) [materialized view, cascades implicitly]

-- Note: Optional foreign keys (study_resources.uploaded_by, practice_sessions.created_by,
--       announcements.created_by) intentionally have no DELETE CASCADE to preserve
--       historical data when a user is deleted. This is by design.

-- All required foreign keys already have ON DELETE CASCADE from initial schema.
-- No additional cascade constraints needed.


-- ───────────────────────────────────────────────────────────────────────────────────
--  7. UPDATED_AT TRIGGER FUNCTION & APPLICATION
--  Automatically update the updated_at timestamp on row modification
-- ───────────────────────────────────────────────────────────────────────────────────

-- Create generic trigger function (idempotent)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to users table
CREATE TRIGGER trg_users_set_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Apply trigger to build_logs table
CREATE TRIGGER trg_build_logs_set_updated_at
  BEFORE UPDATE ON build_logs
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Apply trigger to topic_mastery table (also has updated_at)
CREATE TRIGGER trg_topic_mastery_set_updated_at
  BEFORE UPDATE ON topic_mastery
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Helper function for study_paths.last_activity_at (must be created before trigger)
CREATE OR REPLACE FUNCTION set_updated_at_last_activity()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_activity_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to study_paths table
CREATE TRIGGER trg_study_paths_activity_timestamp
  BEFORE INSERT OR UPDATE ON study_paths
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at_last_activity();


-- ───────────────────────────────────────────────────────────────────────────────────
--  SUMMARY OF CHANGES
-- ───────────────────────────────────────────────────────────────────────────────────

-- 1. Added 5 missing indexes for query performance
--    - idx_quiz_attempts_completed
--    - idx_partnerships_event
--    - idx_partnerships_partners
--    - idx_topic_mastery_updated
--    - idx_announcements_created

-- 2. Created rate_limits table with RLS policies
--    - Tracks action frequency per user
--    - Supports: 'generate_quiz', 'analyze_test', etc.

-- 3. Duplicate prevention via prevent_duplicate_quiz_attempts() trigger
--    - Rejects identical submissions within 5 seconds

-- 4. JSONB validation constraints
--    - quiz_questions.options: must be 4-element array
--    - quiz_questions.correct_index: must be 0-3
--    - study_paths.stage_progress: must contain all 4 stage keys

-- 5. Partner synergy materialized view
--    - Precomputes synergy scores across partnerships
--    - Indexed on event_id and avg_max_topic_score
--    - Refresh function: refresh_partner_synergy_scores()

-- 6. Verified cascade deletes
--    - All required FK relationships already have ON DELETE CASCADE
--    - Optional FKs intentionally preserved to maintain historical records

-- 7. Automated updated_at triggers
--    - set_updated_at(): generic trigger function
--    - Applied to users, build_logs, topic_mastery
--    - Applied set_updated_at_last_activity() to study_paths

-- ═══════════════════════════════════════════════════════════════════════════════════
