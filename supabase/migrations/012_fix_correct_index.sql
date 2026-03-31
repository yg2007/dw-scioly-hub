-- ════════════════════════════════════════════════════════════════
--  Migration 012: Fix correct_index + quarantine bad MC questions
--
--  PROBLEMS FOUND in UChicago 2026 seed data:
--
--  1. correct_index always defaults to 0 because the seed script used
--     case-sensitive text matching. The correct_answer_text uses the format
--     "B - left frontal lobe (+2)" and matching failed for most questions.
--
--  2. ~40 of 88 "multiple_choice" questions are actually corrupted: their
--     correct_answer_text is tournament header/cover page text (e.g.,
--     "2025 University of Chicago Science Olympiad Invitational",
--     "Team Name: ______") rather than a real letter-based answer.
--     These should be excluded from quizzes until a coach reviews them.
--
--  FIXES:
--    Step 1: Update correct_index for questions where correct_answer_text
--            matches the "LETTER - text" or "LETTER" pattern (A/B/C/D).
--
--    Step 2: Change question_type to 'short_answer' for corrupted MC
--            questions (non-letter correct_answer) so they're excluded
--            from the MC/TF quiz filter. Adds them to review queue.
--
--  Run this in Supabase SQL Editor.
-- ════════════════════════════════════════════════════════════════


-- ─── Step 1: Fix correct_index for good MC questions ─────────
UPDATE quiz_questions
SET correct_index = (
  CASE
    WHEN correct_answer_text ~* '^[Aa]\s*[-–\.\)\s]' THEN 0
    WHEN correct_answer_text ~* '^[Bb]\s*[-–\.\)\s]' THEN 1
    WHEN correct_answer_text ~* '^[Cc]\s*[-–\.\)\s]' THEN 2
    WHEN correct_answer_text ~* '^[Dd]\s*[-–\.\)\s]' THEN 3
    -- Handle bare letter answers like "A", "B", "C", "D"
    WHEN correct_answer_text ~* '^[Aa]$' THEN 0
    WHEN correct_answer_text ~* '^[Bb]$' THEN 1
    WHEN correct_answer_text ~* '^[Cc]$' THEN 2
    WHEN correct_answer_text ~* '^[Dd]$' THEN 3
    ELSE correct_index
  END
)
WHERE
  question_type = 'multiple_choice'
  AND correct_answer_text ~* '^[A-Da-d](\s*[-–\.\)\s]|$)';


-- ─── Step 2: Quarantine corrupted MC questions ────────────────
-- These are rows where correct_answer_text does NOT start with A/B/C/D
-- AND is longer than 4 characters (excludes numeric station answers).
-- Change type to 'short_answer' to filter them out of quizzes.

UPDATE quiz_questions
SET question_type = 'short_answer'
WHERE
  question_type = 'multiple_choice'
  AND NOT (correct_answer_text ~* '^[A-Da-d](\s*[-–\.\)\s]|$)')
  AND LENGTH(correct_answer_text) > 4;


-- ─── Step 3: Add quarantined questions to review queue ────────
-- So coaches can see and fix them via the Question Bank page.
-- Columns: question_id (INT), event_id (INT NOT NULL), flagged_reason TEXT, reviewed BOOLEAN
INSERT INTO question_review_queue (question_id, event_id, flagged_reason, reviewed)
SELECT
  id,
  event_id,
  'auto_flagged: correct_answer format invalid — seeded from tournament header text',
  false
FROM quiz_questions
WHERE
  question_type = 'short_answer'
  AND source_tournament = 'UChicago 2026'
  AND LENGTH(correct_answer_text) > 4
  AND NOT (correct_answer_text ~* '^[A-Da-d]')
ON CONFLICT DO NOTHING;


-- ─── Verification ─────────────────────────────────────────────
SELECT
  question_type,
  COUNT(*) AS count
FROM quiz_questions
GROUP BY question_type
ORDER BY count DESC;

SELECT
  correct_index,
  COUNT(*) AS count
FROM quiz_questions
WHERE question_type = 'multiple_choice'
GROUP BY correct_index
ORDER BY correct_index;
