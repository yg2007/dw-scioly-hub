// ═══════════════════════════════════════════════════════════════
//  Unified Data Hooks
//
//  These hooks abstract away IS_PRODUCTION branching so UI
//  components never need to know about the data source.
//  Each hook returns the same shape regardless of mode.
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useMemo } from "react";
import { IS_PRODUCTION } from "../lib/featureFlags";
import { supabase } from "../lib/supabase";
import {
  EVENTS,
  STUDENTS,
  PARTNERSHIPS,
  QUIZ_BANK,
  generateMastery,
} from "../data/mockData";
import { useEvents as useProdEvents } from "./useEvents";
import { useTopicMastery as useProdTopicMastery } from "./useQuizzes";

// ─── useUnifiedEvents ────────────────────────────────────────
// Returns all events (or user's events if filtered) with loading state.
// UI components should call this instead of checking IS_PRODUCTION.
export function useUnifiedEvents({ userId, userOnly = false } = {}) {
  const { events: prodEvents, loading, error, refetch } = useProdEvents();

  const events = useMemo(() => {
    if (IS_PRODUCTION) {
      return prodEvents || [];
    }
    return EVENTS;
  }, [prodEvents]);

  const userEvents = useMemo(() => {
    if (!userOnly || !userId) return events;
    // Filter by user's assigned events
    if (IS_PRODUCTION) {
      // In production, user object has .events array of IDs
      return events;
    }
    const student = STUDENTS.find((s) => s.id === userId);
    if (!student) return events;
    return events.filter((e) => student.events?.includes(e.id));
  }, [events, userId, userOnly]);

  return {
    events: userOnly ? userEvents : events,
    loading: IS_PRODUCTION ? loading : false,
    error,
    refetch,
  };
}

// ─── useUnifiedMastery ───────────────────────────────────────
// Returns mastery data for a user+event combination.
export function useUnifiedMastery(userId, eventId) {
  const {
    mastery: prodMastery,
    loading,
    error,
  } = useProdTopicMastery(userId, eventId);

  const mastery = useMemo(() => {
    if (IS_PRODUCTION) {
      return prodMastery || [];
    }
    if (!userId || !eventId) return [];
    return generateMastery(userId, eventId) || [];
  }, [prodMastery, userId, eventId]);

  const avg = useMemo(() => {
    if (mastery.length === 0) return 0;
    return Math.round(mastery.reduce((s, t) => s + t.score, 0) / mastery.length);
  }, [mastery]);

  return {
    mastery,
    avg,
    hasData: mastery.length > 0,
    loading: IS_PRODUCTION ? loading : false,
    error,
  };
}

// ─── useUnifiedQuizStats ─────────────────────────────────────
// Returns quiz count and study streak for dashboard stats.
export function useUnifiedQuizStats(userId) {
  const [quizCount, setQuizCount] = useState(IS_PRODUCTION ? null : 37);
  const [streakDays, setStreakDays] = useState(IS_PRODUCTION ? null : 12);

  useEffect(() => {
    if (!IS_PRODUCTION || !userId) return;

    supabase
      .from("quiz_attempts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .then(({ count }) => {
        setQuizCount(count || 0);
      });

    supabase
      .from("quiz_attempts")
      .select("completed_at")
      .eq("user_id", userId)
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false })
      .limit(60)
      .then(({ data }) => {
        if (!data || data.length === 0) {
          setStreakDays(0);
          return;
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dates = new Set(
          data.map((d) => {
            const dt = new Date(d.completed_at);
            dt.setHours(0, 0, 0, 0);
            return dt.toISOString().split("T")[0];
          })
        );
        let streak = 0;
        let checkDate = new Date(today);
        while (dates.has(checkDate.toISOString().split("T")[0])) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        }
        setStreakDays(streak);
      });
  }, [userId]);

  return { quizCount, streakDays };
}

// ─── useUnifiedPartnerships ──────────────────────────────────
// Returns partnerships for a given user.
export function useUnifiedPartnerships(userId) {
  const [prodPartnerships, setProdPartnerships] = useState([]);
  const [loading, setLoading] = useState(IS_PRODUCTION);

  useEffect(() => {
    if (!IS_PRODUCTION || !userId) {
      setLoading(false);
      return;
    }

    supabase
      .from("partnerships")
      .select("*, users!partnerships_partner1_fkey(full_name, initials, avatar_color)")
      .or(`partner1.eq.${userId},partner2.eq.${userId}`)
      .then(({ data, error }) => {
        if (!error && data) setProdPartnerships(data);
        setLoading(false);
      });
  }, [userId]);

  const partnerships = useMemo(() => {
    if (IS_PRODUCTION) return prodPartnerships;
    if (!userId) return [];
    return PARTNERSHIPS.filter((p) => p.partners?.includes(userId)).slice(0, 3);
  }, [prodPartnerships, userId]);

  return { partnerships, loading };
}

// ─── useUnifiedQuizQuestions ─────────────────────────────────
// Returns adaptive quiz questions for an event.
//
// In production: uses the adaptive_quiz_questions RPC which
// weights selection by mastery gaps (60% weak / 30% mid / 10% strong)
// and respects spaced repetition schedules.
//
// Falls back gracefully to random selection if the RPC isn't
// available yet (e.g. migration not yet run).
export function useUnifiedQuizQuestions(eventId, userId = null, count = 10, topicFilter = null) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!eventId) {
      setLoading(false);
      return;
    }

    if (IS_PRODUCTION) {
      // ── Try adaptive RPC first ───────────────────────────
      // Only MC and true/false — quick-test types with clean right/wrong signal
      const QUIZ_TYPES = ["multiple_choice", "true_false"];

      const fetchAdaptive = async () => {
        // When a topic filter is active, skip RPC (it doesn't support topic filtering)
        // and go directly to filtered fallback
        if (userId && !topicFilter) {
          const { data, error } = await supabase.rpc(
            "adaptive_quiz_questions",
            { p_user_id: userId, p_event_id: eventId, p_count: count }
          );
          if (!error && data && data.length > 0) {
            // Filter to quiz-friendly types client-side
            const filtered = data.filter(
              (q) => !q.question_type || QUIZ_TYPES.includes(q.question_type)
            );
            if (filtered.length > 0) return filtered;
          }
        }

        // Fallback: direct query with optional topic filter (MC + T/F only)
        let q = supabase
          .from("quiz_questions")
          .select("*")
          .eq("event_id", eventId)
          .in("question_type", QUIZ_TYPES);

        if (topicFilter) {
          q = q.ilike("topic", `%${topicFilter}%`);
        }

        const { data, error } = await q.order("id");

        if (error || !data || data.length === 0) return null;
        return [...data].sort(() => Math.random() - 0.5).slice(0, count);
      };

      fetchAdaptive().then((data) => {
        if (data && data.length > 0) {
          setQuestions(data.map(normalizeQuestion));
        } else {
          // No MC/TF questions found for this event (e.g. all questions are short-answer).
          // Return empty — QuizPage will show a clear "no questions available" message.
          // Never silently serve mock data for a different event.
          setQuestions([]);
        }
        setLoading(false);
      });
    } else {
      const bank = QUIZ_BANK[eventId] || QUIZ_BANK[1] || [];
      let filtered = bank;
      if (topicFilter) {
        filtered = bank.filter((q) =>
          q.topic?.toLowerCase().includes(topicFilter.toLowerCase())
        );
        if (filtered.length === 0) filtered = bank; // fall back to all if no matches
      }
      setQuestions(
        [...filtered]
          .sort(() => Math.random() - 0.5)
          .slice(0, Math.min(count, filtered.length))
      );
      setLoading(false);
    }
  }, [eventId, userId, count, topicFilter]);

  return { questions, loading };
}

// ─── normalizeQuestion ───────────────────────────────────────
// Maps a quiz_questions DB row to the shape QuizPage expects.
function normalizeQuestion(q) {
  const opts =
    typeof q.options === "string" ? JSON.parse(q.options) : q.options || [];

  return {
    id: q.id,
    q: q.question,
    options: opts,
    correct: q.correct_index ?? 0,
    correctText: q.correct_answer_text || opts[q.correct_index] || "",
    topic: q.topic || "General",
    subtopic: q.subtopic || null,
    difficulty: q.difficulty === "easy" ? 1 : q.difficulty === "hard" ? 3 : 2,
    questionType: q.question_type || "multiple_choice",
    explanation: q.explanation || null,
    points: q.points || 1,
    source: q.source_tournament || null,
  };
}

// ─── useUnifiedStudents ──────────────────────────────────────
// Returns the full student roster.
export function useUnifiedStudents() {
  const [prodStudents, setProdStudents] = useState([]);
  const [loading, setLoading] = useState(IS_PRODUCTION);

  useEffect(() => {
    if (!IS_PRODUCTION) {
      setLoading(false);
      return;
    }

    supabase
      .from("users")
      .select("*")
      .eq("role", "student")
      .then(({ data, error }) => {
        if (!error && data) setProdStudents(data);
        setLoading(false);
      });
  }, []);

  return {
    students: IS_PRODUCTION ? prodStudents : STUDENTS,
    loading,
  };
}
