import { supabase } from "./supabase";
import {
  MASTERY_NEW_WEIGHT,
  MASTERY_OLD_WEIGHT,
  MASTERY_TREND_THRESHOLD,
} from "./constants";

/**
 * Calculate topic mastery score and trend from quiz answers
 * Applies weighted average with recency bias and trend detection
 *
 * @param {Array<{topic: string, correct: boolean}>} answers - Quiz answers by topic
 * @param {number} [existingScore=null] - Previous mastery score (if updating)
 * @returns {{score: number, trend: string}} Calculated score and trend
 *
 * @example
 * const { score, trend } = calculateMastery(
 *   [{topic: "Biology", correct: true}, {topic: "Biology", correct: false}],
 *   85
 * )
 * // { score: 84.5, trend: "stable" }
 */
export function calculateMastery(answers, existingScore = null) {
  // Group answers by topic and calculate per-topic accuracy
  const topicScores = {};
  for (const ans of answers) {
    if (!topicScores[ans.topic]) {
      topicScores[ans.topic] = { correct: 0, total: 0 };
    }
    topicScores[ans.topic].total++;
    if (ans.correct) topicScores[ans.topic].correct++;
  }

  const results = {};

  for (const [topic, { correct, total }] of Object.entries(topicScores)) {
    const newScore = (correct / total) * 100;
    let finalScore = newScore;
    let trend = "stable";

    if (existingScore !== null && existingScore !== undefined) {
      // Weighted average: new weight for new score, old weight for existing
      finalScore =
        newScore * MASTERY_NEW_WEIGHT + existingScore * MASTERY_OLD_WEIGHT;

      // Detect trend based on threshold
      if (finalScore > existingScore + MASTERY_TREND_THRESHOLD) {
        trend = "up";
      } else if (finalScore < existingScore - MASTERY_TREND_THRESHOLD) {
        trend = "down";
      }
    }

    results[topic] = {
      score: Math.round(finalScore * 100) / 100,
      trend,
    };
  }

  return results;
}

/**
 * Update topic mastery in database after a quiz attempt
 * Fetches existing scores and applies weighted calculation
 *
 * @param {string} userId - User UUID
 * @param {string} eventId - Event UUID
 * @param {Array<{topic: string, correct: boolean}>} answers - Quiz answers
 * @returns {Promise<void>}
 * @throws {Error} If database operations fail
 *
 * @example
 * await updateMasteryFromAttempt(userId, eventId, answers)
 */
export async function updateMasteryFromAttempt(userId, eventId, answers) {
  // Group answers by topic
  const topicScores = {};
  for (const ans of answers) {
    if (!topicScores[ans.topic]) {
      topicScores[ans.topic] = { correct: 0, total: 0 };
    }
    topicScores[ans.topic].total++;
    if (ans.correct) topicScores[ans.topic].correct++;
  }

  // Process each topic
  for (const [topic, { correct, total }] of Object.entries(topicScores)) {
    const newScore = (correct / total) * 100;

    // Fetch existing mastery
    const { data: existing } = await supabase
      .from("topic_mastery")
      .select("score")
      .eq("user_id", userId)
      .eq("event_id", eventId)
      .eq("topic", topic)
      .single();

    let finalScore = newScore;
    let trend = "stable";

    if (existing) {
      // Weighted average: new weight for new score, old weight for existing
      finalScore =
        newScore * MASTERY_NEW_WEIGHT + existing.score * MASTERY_OLD_WEIGHT;

      // Detect trend based on threshold
      if (finalScore > existing.score + MASTERY_TREND_THRESHOLD) {
        trend = "up";
      } else if (finalScore < existing.score - MASTERY_TREND_THRESHOLD) {
        trend = "down";
      }
    }

    // Upsert to database
    await supabase.from("topic_mastery").upsert(
      {
        user_id: userId,
        event_id: eventId,
        topic,
        score: Math.round(finalScore * 100) / 100,
        trend,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,event_id,topic" }
    );
  }
}
