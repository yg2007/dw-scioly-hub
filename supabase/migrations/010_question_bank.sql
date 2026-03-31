-- ═══════════════════════════════════════════════════════════════
--  DW SciOly Hub — Migration 010: Question Bank Extension
--
--  Extends quiz_questions with richer fields from the ingestion
--  pipeline, and adds a question_bank_meta table for tracking
--  which source files have been ingested.
-- ═══════════════════════════════════════════════════════════════

-- ─── EXTEND quiz_questions ────────────────────────────────────
-- Add subtopic, question_type, correct_answer_text, source, points
-- These are nullable so existing rows are unaffected.

ALTER TABLE quiz_questions
  ADD COLUMN IF NOT EXISTS subtopic          TEXT,
  ADD COLUMN IF NOT EXISTS question_type     TEXT DEFAULT 'multiple_choice',
  ADD COLUMN IF NOT EXISTS correct_answer_text TEXT,
  ADD COLUMN IF NOT EXISTS source_tournament TEXT,
  ADD COLUMN IF NOT EXISTS points            INT  DEFAULT 1;

-- Index for adaptive selection: filter by subtopic + difficulty
CREATE INDEX IF NOT EXISTS idx_quiz_questions_event_subtopic
  ON quiz_questions (event_id, subtopic, difficulty);

-- Index for source tracking (avoid re-ingesting same tournament)
CREATE INDEX IF NOT EXISTS idx_quiz_questions_source
  ON quiz_questions (source_tournament);

-- ─── INGESTION LOG ────────────────────────────────────────────
-- Tracks which tournament folders have been ingested so the
-- pipeline can skip already-processed sources on re-runs.

CREATE TABLE IF NOT EXISTS ingestion_log (
  id              SERIAL PRIMARY KEY,
  source_name     TEXT NOT NULL UNIQUE,   -- e.g. "UChicago 2026"
  event_count     INT  NOT NULL DEFAULT 0,
  question_count  INT  NOT NULL DEFAULT 0,
  ingested_at     TIMESTAMPTZ DEFAULT now(),
  notes           TEXT
);

-- ─── QUESTION REVIEW QUEUE ────────────────────────────────────
-- Questions flagged for coach review before going live.
-- Populated by ingestion pipeline; cleared by coach approval.

CREATE TABLE IF NOT EXISTS question_review_queue (
  id              SERIAL PRIMARY KEY,
  question_id     INT REFERENCES quiz_questions(id) ON DELETE CASCADE,
  event_id        INT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  flagged_reason  TEXT,       -- e.g. "low_confidence_tag", "needs_image"
  reviewed        BOOLEAN     DEFAULT false,
  reviewed_by     UUID        REFERENCES users(id),
  reviewed_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ─── SPACED REPETITION SCHEDULE ──────────────────────────────
-- Tracks per-student, per-question review schedule (SM-2 algorithm).
-- next_review_at drives the adaptive quiz composer.

CREATE TABLE IF NOT EXISTS question_schedule (
  id              SERIAL PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES users(id)         ON DELETE CASCADE,
  question_id     INT  NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
  event_id        INT  NOT NULL REFERENCES events(id)         ON DELETE CASCADE,
  interval_days   FLOAT NOT NULL DEFAULT 1,   -- SM-2 interval
  ease_factor     FLOAT NOT NULL DEFAULT 2.5, -- SM-2 ease (min 1.3)
  repetitions     INT   NOT NULL DEFAULT 0,   -- times answered correctly in a row
  next_review_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_answer     TEXT,                       -- 'correct' | 'incorrect' | 'skipped'
  last_seen_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, question_id)
);

-- Index for the adaptive query: "give me this student's due questions for this event"
CREATE INDEX IF NOT EXISTS idx_question_schedule_due
  ON question_schedule (user_id, event_id, next_review_at);

-- ─── RPC: adaptive_quiz_questions ────────────────────────────
-- Returns N questions for a student, weighted by mastery gaps.
-- Called by useUnifiedQuizQuestions hook.
--
-- Algorithm:
--   1. Get student's subtopic mastery scores for this event
--   2. Pull questions due for review (spaced repetition)
--   3. Fill remaining slots: 60% from weak subtopics (<60 mastery)
--                            30% from medium  (60-80 mastery)
--                            10% from strong  (>80 mastery)
--   4. Never return the same question twice in a session

CREATE OR REPLACE FUNCTION adaptive_quiz_questions(
  p_user_id  UUID,
  p_event_id INT,
  p_count    INT DEFAULT 10
)
RETURNS TABLE (
  id               INT,
  question         TEXT,
  options          JSONB,
  correct_index    INT,
  correct_answer_text TEXT,
  topic            TEXT,
  subtopic         TEXT,
  difficulty       quiz_difficulty,
  question_type    TEXT,
  explanation      TEXT,
  points           INT,
  source_tournament TEXT
)
LANGUAGE plpgsql AS $$
DECLARE
  weak_count   INT := CEIL(p_count * 0.6);
  medium_count INT := CEIL(p_count * 0.3);
  strong_count INT := p_count - CEIL(p_count * 0.6) - CEIL(p_count * 0.3);
BEGIN
  RETURN QUERY
  WITH mastery AS (
    -- Get student's current mastery per subtopic
    SELECT
      tm.topic    AS subtopic,
      tm.score    AS mastery_score
    FROM topic_mastery tm
    WHERE tm.user_id = p_user_id AND tm.event_id = p_event_id
  ),
  due_questions AS (
    -- Spaced repetition: questions due for review take priority
    SELECT qq.id
    FROM question_schedule qs
    JOIN quiz_questions qq ON qq.id = qs.question_id
    WHERE qs.user_id = p_user_id
      AND qs.event_id = p_event_id
      AND qs.next_review_at <= now()
    ORDER BY qs.next_review_at ASC
    LIMIT p_count
  ),
  weak_q AS (
    SELECT qq.id
    FROM quiz_questions qq
    LEFT JOIN mastery m ON m.subtopic = qq.subtopic
    WHERE qq.event_id = p_event_id
      AND qq.id NOT IN (SELECT id FROM due_questions)
      AND COALESCE(m.mastery_score, 0) < 60
    ORDER BY COALESCE(m.mastery_score, 0) ASC, random()
    LIMIT weak_count
  ),
  medium_q AS (
    SELECT qq.id
    FROM quiz_questions qq
    LEFT JOIN mastery m ON m.subtopic = qq.subtopic
    WHERE qq.event_id = p_event_id
      AND qq.id NOT IN (SELECT id FROM due_questions)
      AND qq.id NOT IN (SELECT id FROM weak_q)
      AND COALESCE(m.mastery_score, 0) BETWEEN 60 AND 80
    ORDER BY random()
    LIMIT medium_count
  ),
  strong_q AS (
    SELECT qq.id
    FROM quiz_questions qq
    LEFT JOIN mastery m ON m.subtopic = qq.subtopic
    WHERE qq.event_id = p_event_id
      AND qq.id NOT IN (SELECT id FROM due_questions)
      AND qq.id NOT IN (SELECT id FROM weak_q)
      AND qq.id NOT IN (SELECT id FROM medium_q)
      AND COALESCE(m.mastery_score, 0) > 80
    ORDER BY random()
    LIMIT strong_count
  ),
  all_ids AS (
    SELECT id FROM due_questions
    UNION ALL SELECT id FROM weak_q
    UNION ALL SELECT id FROM medium_q
    UNION ALL SELECT id FROM strong_q
  )
  SELECT
    qq.id, qq.question, qq.options, qq.correct_index,
    qq.correct_answer_text, qq.topic, qq.subtopic,
    qq.difficulty, qq.question_type, qq.explanation,
    qq.points, qq.source_tournament
  FROM quiz_questions qq
  JOIN all_ids a ON a.id = qq.id
  ORDER BY random()
  LIMIT p_count;
END;
$$;
