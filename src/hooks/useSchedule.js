import { useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, invalidateCache } from "../lib/query";
import { supabase } from "../lib/supabase";
import { ANNOUNCEMENTS_PAGE_SIZE } from "../lib/constants";

/**
 * Fetch practice sessions with realtime updates
 * @returns {UseScheduleResult} Sessions list with CRUD mutations
 */
export function useSchedule() {
  const { data: sessions, error, loading, refetch } = useQuery(
    "practice-sessions",
    async () => {
      const { data, error } = await supabase
        .from("practice_sessions")
        .select("*")
        .order("start_time");

      if (error) throw error;
      return data;
    }
  );

  // Setup realtime subscription
  useEffect(() => {
    const channelName = `schedule-changes-${Math.random().toString(36).substr(2, 9)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "practice_sessions" },
        () => {
          invalidateCache("practice-sessions");
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  const {
    mutate: createSession,
    loading: creatingSession,
    error: createError,
  } = useMutation(
    async (session) => {
      const { data, error } = await supabase
        .from("practice_sessions")
        .insert(session)
        .select()
        .single();
      if (error) throw error;

      invalidateCache("practice-sessions");
      refetch();

      return data;
    }
  );

  const {
    mutate: updateSession,
    loading: updatingSession,
    error: updateError,
  } = useMutation(
    async (id, updates) => {
      const { error } = await supabase
        .from("practice_sessions")
        .update(updates)
        .eq("id", id);
      if (error) throw error;

      invalidateCache("practice-sessions");
      refetch();
    }
  );

  const {
    mutate: deleteSession,
    loading: deletingSession,
    error: deleteError,
  } = useMutation(
    async (id) => {
      const { error } = await supabase
        .from("practice_sessions")
        .delete()
        .eq("id", id);
      if (error) throw error;

      invalidateCache("practice-sessions");
      refetch();
    }
  );

  return {
    sessions: sessions || [],
    loading,
    error,
    createSession,
    creatingSession,
    createError,
    updateSession,
    updatingSession,
    updateError,
    deleteSession,
    deletingSession,
    deleteError,
    refetch,
  };
}

/**
 * Fetch announcements with pagination and realtime updates
 * @param {Object} options - Configuration options
 * @param {number} options.page - Page number (default: 1)
 * @returns {Object} Announcements list with post mutation
 */
export function useAnnouncements(options = {}) {
  const { page = 1 } = options;
  const offset = (page - 1) * ANNOUNCEMENTS_PAGE_SIZE;

  const { data: announcements, error, loading, refetch } = useQuery(
    `announcements-${page}`,
    async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("*, users(full_name)")
        .order("created_at", { ascending: false })
        .range(offset, offset + ANNOUNCEMENTS_PAGE_SIZE - 1);

      if (error) throw error;
      return data;
    }
  );

  // Setup realtime subscription (only for new inserts)
  useEffect(() => {
    const channelName = `announcements-${Math.random().toString(36).substr(2, 9)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "announcements" },
        () => {
          invalidateCache(`announcements-${page}`);
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [page, refetch]);

  const { mutate: post, loading: posting, error: postError } = useMutation(
    async ({ title, body, priority, createdBy }) => {
      const { data, error } = await supabase
        .from("announcements")
        .insert({ title, body, priority, created_by: createdBy })
        .select()
        .single();
      if (error) throw error;

      invalidateCache(`announcements-${page}`);
      refetch();

      return data;
    }
  );

  return {
    announcements: announcements || [],
    loading,
    error,
    post,
    posting,
    postError,
    refetch,
  };
}
