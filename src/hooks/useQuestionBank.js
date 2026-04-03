import { useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useQuery, useMutation, invalidateCache } from "../lib/query";

// ─── Edit Question (coach-facing) ────────────────────────────

/**
 * Save coach edits to a question's wording and/or options.
 *
 * On first edit, snapshots original_question / original_options
 * so coaches can always see what was changed.
 * Stamps last_edited_by + last_edited_at on every save.
 *
 * @param {Object} vars
 * @param {number}   vars.questionId
 * @param {string}   vars.question        - updated question text
 * @param {string[]} vars.options         - updated 4-element options array
 * @param {number}   vars.correctIndex    - index of correct option
 * @param {string}   vars.correctAnswerText
 * @param {string}   vars.currentQuestion - original text (for snapshot)
 * @param {any[]}    vars.currentOptions  - original options (for snapshot)
 * @param {string}   vars.editorId        - UUID of the coach making the edit
 */
export function useEditQuestion() {
  const { mutate, loading, error, reset } = useMutation(
    async ({
      questionId,
      question,
      options,
      correctIndex,
      correctAnswerText,
      currentQuestion,
      currentOptions,
      editorId,
    }) => {
      // Fetch existing question to check if already been edited before
      const { data: existing, error: fetchErr } = await supabase
        .from("quiz_questions")
        .select("original_question, original_options")
        .eq("id", questionId)
        .single();

      if (fetchErr) throw fetchErr;

      const update = {
        question,
        options,
        correct_index: correctIndex,
        correct_answer_text: correctAnswerText,
        last_edited_by: editorId || null,
        last_edited_at: new Date().toISOString(),
        // Only snapshot originals on the very first edit
        original_question: existing.original_question ?? currentQuestion,
        original_options:  existing.original_options  ?? currentOptions,
      };

      const { error: updateErr } = await supabase
        .from("quiz_questions")
        .update(update)
        .eq("id", questionId);

      if (updateErr) throw updateErr;
    },
    {
      onSuccess: () => {
        invalidateCache("review-queue");
        invalidateCache("question-browser");
      },
    }
  );
  return { save: mutate, loading, error, reset };
}

// ─── Report Question (student-facing) ────────────────────────

/**
 * Students flag a question as erroneous from the quiz UI.
 * Inserts a row into question_review_queue so the coach sees it.
 */
export function useReportQuestion() {
  const { mutate, loading, error, reset } = useMutation(
    async ({ questionId, eventId, reason }) => {
      // Avoid duplicate reports — check if already queued and unreviewed
      const { data: existing } = await supabase
        .from("question_review_queue")
        .select("id")
        .eq("question_id", questionId)
        .eq("reviewed", false)
        .maybeSingle();

      if (existing) return; // already flagged, no-op

      const { error } = await supabase
        .from("question_review_queue")
        .insert({
          question_id: questionId,
          event_id: eventId,
          flagged_reason: reason,
          reviewed: false,
        });
      if (error) throw error;
    },
    {
      onSuccess: () => {
        invalidateCache("review-queue");
        invalidateCache("review-queue-count");
      },
    }
  );
  return { report: mutate, loading, error, reset };
}

// ─── Review Queue ────────────────────────────────────────────

/**
 * Fetch all unreviewed questions from question_review_queue,
 * joined with quiz_questions and events.
 */
export function useReviewQueue() {
  const { data, error, loading, refetch } = useQuery(
    "review-queue",
    async () => {
      const { data, error } = await supabase
        .from("question_review_queue")
        .select(`
          id,
          flagged_reason,
          created_at,
          quiz_questions (
            id, question, options, correct_index, correct_answer_text,
            topic, subtopic, difficulty, question_type, source_tournament, points,
            event_id,
            events ( id, name, icon )
          )
        `)
        .eq("reviewed", false)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    }
  );

  return { queue: data || [], loading, error, refetch };
}

/**
 * Approve a queued question — marks it as reviewed so it goes live.
 */
export function useApproveQuestion() {
  const { mutate, loading, error } = useMutation(
    async ({ queueId, reviewedBy }) => {
      const { error } = await supabase
        .from("question_review_queue")
        .update({
          reviewed: true,
          reviewed_by: reviewedBy || null,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", queueId);
      if (error) throw error;
    },
    {
      onSuccess: () => {
        invalidateCache("review-queue");
        invalidateCache("review-queue-count");
      },
    }
  );
  return { approve: mutate, loading, error };
}

/**
 * Reject a queued question — deletes it from quiz_questions entirely
 * (cascades to remove from queue too).
 */
export function useRejectQuestion() {
  const { mutate, loading, error } = useMutation(
    async ({ questionId }) => {
      const { error } = await supabase
        .from("quiz_questions")
        .delete()
        .eq("id", questionId);
      if (error) throw error;
    },
    {
      onSuccess: () => {
        invalidateCache("review-queue");
        invalidateCache("review-queue-count");
        invalidateCache("question-browser");
      },
    }
  );
  return { reject: mutate, loading, error };
}

/**
 * Pending queue count — used to show a badge in the sidebar.
 */
export function useReviewQueueCount() {
  const { data, loading } = useQuery(
    "review-queue-count",
    async () => {
      const { count, error } = await supabase
        .from("question_review_queue")
        .select("id", { count: "exact", head: true })
        .eq("reviewed", false);
      if (error) throw error;
      return count || 0;
    },
    { staleTime: 60_000 }
  );
  return { count: data || 0, loading };
}

// ─── Question Browser Summary (lightweight, for list display) ──

/**
 * Fetch lightweight summary data for browsing questions.
 * Returns only essential fields: id, topic, subtopic, difficulty, etc.
 * Does NOT include heavy question text or options — use useQuestionDetail for full data.
 *
 * @param {Object} filters - { eventId, topic, search, difficulty, questionType }
 */
export function useQuestionBrowserSummary(filters = {}) {
  const { eventId, topic, search, difficulty, questionType } = filters;

  // Build a stable cache key from filters
  const cacheKey = `question-summary-${eventId || ""}-${topic || ""}-${search || ""}-${difficulty || ""}-${questionType || ""}`;

  const queryFn = useCallback(async () => {
    let q = supabase
      .from("quiz_questions")
      .select(`
        id, topic, subtopic, difficulty, question_type, source_tournament, points, ai_generated,
        event_id,
        events ( id, name, icon )
      `)
      .order("event_id", { ascending: true })
      .order("difficulty", { ascending: true })
      .limit(200);

    if (eventId) q = q.eq("event_id", eventId);
    if (difficulty) q = q.eq("difficulty", Number(difficulty));
    if (questionType) q = q.eq("question_type", questionType);
    if (topic) q = q.ilike("topic", `%${topic}%`);
    if (search) q = q.ilike("question", `%${search}%`);  // still search in question text, just don't return it

    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }, [eventId, topic, search, difficulty, questionType]);

  const { data, error, loading, refetch } = useQuery(cacheKey, queryFn);
  return { questions: data || [], loading, error, refetch };
}

// ─── Question Detail (full data, loaded on demand) ──────────────

/**
 * Fetch full question data on demand (when user expands/clicks into it).
 * Includes question text, options, correct answer, editing history, etc.
 *
 * @param {number} questionId - The question to load (can be null to disable)
 */
export function useQuestionDetail(questionId) {
  const queryFn = useCallback(async () => {
    if (!questionId) return null;
    const { data, error } = await supabase
      .from("quiz_questions")
      .select("*")
      .eq("id", questionId)
      .single();
    if (error) throw error;
    return data;
  }, [questionId]);

  const { data, error, loading } = useQuery(
    questionId ? `question-detail-${questionId}` : null,
    queryFn,
    { staleTime: 300_000, enabled: !!questionId }
  );

  return { question: data, loading, error };
}

// ─── Question Browser (legacy, includes full question data) ─────

/**
 * Browse all questions with optional filters.
 * DEPRECATED: Use useQuestionBrowserSummary + useQuestionDetail for better performance.
 *
 * @param {Object} filters - { eventId, topic, search, difficulty, questionType }
 */
export function useQuestionBrowser(filters = {}) {
  const { eventId, topic, search, difficulty, questionType } = filters;

  // Build a stable cache key from filters
  const cacheKey = `question-browser-${eventId || ""}-${topic || ""}-${search || ""}-${difficulty || ""}-${questionType || ""}`;

  const queryFn = useCallback(async () => {
    let q = supabase
      .from("quiz_questions")
      .select(`
        id, question, options, correct_index, correct_answer_text,
        topic, subtopic, difficulty, question_type, source_tournament, points, ai_generated,
        events ( id, name, icon )
      `)
      .order("event_id", { ascending: true })
      .order("difficulty", { ascending: true })
      .limit(200);

    if (eventId) q = q.eq("event_id", eventId);
    if (difficulty) q = q.eq("difficulty", Number(difficulty));
    if (questionType) q = q.eq("question_type", questionType);
    if (topic) q = q.ilike("topic", `%${topic}%`);
    if (search) q = q.ilike("question", `%${search}%`);

    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }, [eventId, topic, search, difficulty, questionType]);

  const { data, error, loading, refetch } = useQuery(cacheKey, queryFn);
  return { questions: data || [], loading, error, refetch };
}

// ─── Ingestion Log ────────────────────────────────────────────

/**
 * Fetch the ingestion log showing what has been loaded.
 */
export function useIngestionLog() {
  const { data, error, loading, refetch } = useQuery(
    "ingestion-log",
    async () => {
      const { data, error } = await supabase
        .from("ingestion_log")
        .select("id, source_name, event_count, question_count, ingested_at, notes")
        .order("ingested_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    { staleTime: 120_000 }
  );
  return { log: data || [], loading, error, refetch };
}

// ─── Import Questions ────────────────────────────────────────

/**
 * Bulk-insert an array of parsed questions into quiz_questions
 * and log the import to ingestion_log.
 *
 * Each question object should have:
 *   { question, question_type, options, correct_index,
 *     correct_answer_text, topic, subtopic, difficulty }
 *
 * @param {Object} vars
 * @param {Array}  vars.questions    - parsed question objects
 * @param {number} vars.eventId      - target event
 * @param {string} vars.sourceName   - label for the ingestion log (e.g. "2026 Regionals")
 * @returns {{ count: number }}
 */
export function useImportQuestions() {
  const { mutate, loading, error, reset } = useMutation(
    async ({ questions, eventId, sourceName }) => {
      if (!questions?.length) throw new Error("No questions to import");
      if (!eventId) throw new Error("Please select a target event before importing");

      const rows = questions.map((q) => ({
        event_id: eventId,
        question: q.question,
        question_type: q.question_type || "multiple_choice",
        options: q.options?.length ? q.options : null,
        correct_index: q.correct_index ?? null,
        correct_answer_text: q.correct_answer_text || "",
        topic: q.topic || "General",
        subtopic: q.subtopic || null,
        difficulty: q.difficulty || 2,
        points: q.points || 1,
        source_tournament: sourceName || null,
      }));

      const { error: insertErr } = await supabase
        .from("quiz_questions")
        .insert(rows);
      if (insertErr) throw insertErr;

      // Log to ingestion_log so it appears in the Ingestion Log tab
      await supabase.from("ingestion_log").insert({
        source_name: sourceName || "Manual Import",
        question_count: rows.length,
        event_count: 1,
        notes: `Imported via Question Bank import tool`,
      });

      return { count: rows.length };
    },
    {
      onSuccess: () => {
        invalidateCache("question-browser");
        invalidateCache("ingestion-log");
      },
    }
  );
  return { importQuestions: mutate, loading, error, reset };
}

// ─── Event list for filter dropdown ─────────────────────────

export function useEventList() {
  const { data, loading } = useQuery(
    "events-list",
    async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, name, icon")
        .order("name");
      if (error) throw error;
      return data || [];
    },
    { staleTime: 300_000 }
  );
  return { events: data || [], loading };
}
