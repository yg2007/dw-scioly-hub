import { useCallback } from "react";
import { useQuery, useMutation, invalidateCache } from "../lib/query";
import { supabase } from "../lib/supabase";
import { CACHE_TTL_QUIZ_QUESTIONS } from "../lib/constants";
import { updateMasteryFromAttempt } from "../lib/mastery";

/**
 * Fetch quiz questions for an event
 * @param {string} eventId - Event UUID
 * @returns {UseQuizQuestionsResult} Questions list with loading and error states
 */
export function useQuizQuestions(eventId) {
  const { data: questions, error, loading, refetch } = useQuery(
    `quiz-questions-${eventId}`,
    async () => {
      const { data, error } = await supabase
        .from("quiz_questions")
        .select("*")
        .eq("event_id", eventId)
        .order("id");

      if (error) throw error;

      // Transform to match prototype shape
      return data.map((q) => ({
        id: q.id,
        q: q.question,
        options: q.options, // already JSONB array
        correct: q.correct_index,
        topic: q.topic,
        difficulty:
          q.difficulty === "easy"
            ? 1
            : q.difficulty === "hard"
              ? 3
              : 2,
        explanation: q.explanation,
      }));
    },
    { staleTime: CACHE_TTL_QUIZ_QUESTIONS, enabled: !!eventId }
  );

  return { questions: questions || [], loading, error, refetch };
}

/**
 * Generate AI quiz questions via Edge Function
 * @returns {Object} generateQuiz function and loading state
 */
export function useAIQuiz() {
  const { mutate: generateQuiz, loading: generating, error } = useMutation(
    async (eventId, topic, difficulty, count = 5) => {
      const { data, error } = await supabase.functions.invoke(
        "generate-quiz",
        {
          body: { eventId, topic, difficulty, count },
        }
      );
      if (error) throw error;
      return data.questions; // returns array in prototype shape
    }
  );

  return { generateQuiz, generating, error };
}

/**
 * Submit quiz attempts and fetch user's attempt history
 * @param {string} userId - User UUID
 * @param {Object} options - Configuration options
 * @param {number} options.page - Page number (default: 1)
 * @param {number} options.pageSize - Items per page (default: 20)
 * @returns {UseQuizAttemptsResult} Attempts list with submitAttempt mutation
 */
export function useQuizAttempts(userId, options = {}) {
  const { page = 1, pageSize = 20 } = options;
  const offset = (page - 1) * pageSize;

  const { data: attempts, error, loading, refetch } = useQuery(
    `quiz-attempts-${userId}-${page}`,
    async () => {
      const { data, error } = await supabase
        .from("quiz_attempts")
        .select("*")
        .eq("user_id", userId)
        .order("completed_at", { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (error) throw error;
      return data;
    },
    { enabled: !!userId }
  );

  const {
    mutate: submitAttempt,
    loading: submitting,
    error: submitError,
  } = useMutation(
    async ({ eventId, score, total, answers, timeTaken }) => {
      const { data, error } = await supabase
        .from("quiz_attempts")
        .insert({
          user_id: userId,
          event_id: eventId,
          score,
          total,
          answers,
          time_taken_seconds: timeTaken,
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Update topic mastery after quiz
      await updateMasteryFromAttempt(userId, eventId, answers);

      // Invalidate caches
      invalidateCache(`quiz-attempts-${userId}-${page}`);
      invalidateCache(`topic-mastery-${userId}-${eventId}`);
      refetch();

      return data;
    }
  );

  return {
    attempts: attempts || [],
    loading,
    error,
    submitAttempt,
    submitting,
    submitError,
    refetch,
  };
}

/**
 * Fetch topic mastery for a user+event combination
 * @param {string} userId - User UUID
 * @param {string} eventId - Event UUID
 * @returns {UseTopicMasteryResult} Mastery records with loading and error states
 */
export function useTopicMastery(userId, eventId) {
  const { data: mastery, error, loading, refetch } = useQuery(
    `topic-mastery-${userId}-${eventId}`,
    async () => {
      const { data, error } = await supabase
        .from("topic_mastery")
        .select("*")
        .eq("user_id", userId)
        .eq("event_id", eventId);

      if (error) throw error;
      return data;
    },
    { enabled: !!userId && !!eventId }
  );

  return { mastery: mastery || [], loading, error, refetch };
}
