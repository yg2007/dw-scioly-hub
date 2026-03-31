/**
 * SM-2 Spaced Repetition Algorithm
 *
 * Based on the SuperMemo SM-2 algorithm. Schedules the next review
 * date for a quiz question based on whether the student answered correctly.
 *
 * Grade scale used here:
 *   5 = correct, confident
 *   4 = correct (default for a right answer)
 *   1 = incorrect (default for a wrong answer)
 *   0 = complete blackout
 *
 * After each quiz:
 *   - Updates easiness_factor (EF), interval (days), repetitions
 *   - Writes next_review date to question_schedule table
 */
import { supabase } from "./supabase";

const DEFAULT_EF = 2.5;
const MIN_EF     = 1.3;

/**
 * Calculate updated SM-2 values from current state + grade.
 *
 * @param {Object} current - Existing schedule row (or null for new)
 * @param {number} grade   - Quality of recall: 4 (correct) or 1 (incorrect)
 * @returns {{ repetitions, interval, easinessFactor, nextReview }}
 */
export function calcSM2(current, grade) {
  let { repetitions = 0, interval = 1, easinessFactor = DEFAULT_EF } = current || {};

  if (grade >= 3) {
    // Correct response
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easinessFactor);
    }
    repetitions += 1;
  } else {
    // Incorrect — reset repetition count, review tomorrow
    repetitions = 0;
    interval = 1;
  }

  // Update EF: EF' = EF + (0.1 - (5-q)(0.08 + (5-q)*0.02))
  const delta = 0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02);
  easinessFactor = Math.max(MIN_EF, easinessFactor + delta);

  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + interval);
  // Strip time component — review date only
  const nextReviewDate = nextReview.toISOString().split("T")[0];

  return {
    repetitions,
    interval,
    easinessFactor: Math.round(easinessFactor * 1000) / 1000,
    nextReview: nextReviewDate,
  };
}

/**
 * Update the question_schedule table after a quiz attempt.
 * Upserts one row per answered question.
 *
 * @param {string} userId
 * @param {Array<{ questionId: number|string, isCorrect: boolean }>} answers
 * @returns {Promise<void>}
 */
export async function updateSM2Schedule(userId, answers) {
  if (!userId || !answers || answers.length === 0) return;

  const questionIds = answers.map((a) => a.questionId).filter(Boolean);
  if (questionIds.length === 0) return;

  // Fetch existing schedule rows for these questions
  const { data: existing } = await supabase
    .from("question_schedule")
    .select("question_id, repetitions, interval, easiness_factor")
    .eq("user_id", userId)
    .in("question_id", questionIds);

  const scheduleMap = {};
  for (const row of existing || []) {
    scheduleMap[row.question_id] = {
      repetitions: row.repetitions,
      interval: row.interval,
      easinessFactor: row.easiness_factor,
    };
  }

  const now = new Date().toISOString();
  const upserts = answers
    .filter((a) => a.questionId)
    .map((a) => {
      const grade = a.isCorrect ? 4 : 1;
      const updated = calcSM2(scheduleMap[a.questionId] || null, grade);
      return {
        user_id: userId,
        question_id: a.questionId,
        repetitions: updated.repetitions,
        interval: updated.interval,
        easiness_factor: updated.easinessFactor,
        next_review: updated.nextReview,
        last_reviewed: now,
      };
    });

  if (upserts.length === 0) return;

  // Upsert — conflict on (user_id, question_id)
  const { error } = await supabase
    .from("question_schedule")
    .upsert(upserts, { onConflict: "user_id,question_id" });

  if (error) {
    // Non-fatal — log but don't throw so quiz flow isn't broken
    console.warn("[SM-2] Failed to update question_schedule:", error.message);
  }
}
