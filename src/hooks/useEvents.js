import { useQuery, useMutation, invalidateCache } from "../lib/query";
import { supabase } from "../lib/supabase";
import { CACHE_TTL_EVENTS } from "../lib/constants";

/**
 * Fetch all events with their topics
 * @returns {UseEventsResult} Events list with loading and error states
 */
export function useEvents() {
  const { data: events, error, loading, refetch } = useQuery(
    "events",
    async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*, event_topics(name, sort_order)")
        .order("id");

      if (error) throw error;

      // Transform to match prototype shape: { ...event, topics: ["Topic1", ...] }
      return data.map((e) => ({
        ...e,
        topics: (e.event_topics || [])
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((t) => t.name),
      }));
    },
    { staleTime: CACHE_TTL_EVENTS }
  );

  return { events: events || [], loading, error, refetch };
}

/**
 * Fetch events assigned to a specific user
 * @param {string} userId - User UUID
 * @returns {UseUserEventsResult} User's events with assign/unassign mutations
 */
export function useUserEvents(userId) {
  const { data: eventIds = [], error, loading, refetch } = useQuery(
    `user-events-${userId}`,
    async () => {
      const { data, error } = await supabase
        .from("user_events")
        .select("event_id")
        .eq("user_id", userId);

      if (error) throw error;
      return data.map((d) => d.event_id);
    },
    { enabled: !!userId }
  );

  const { mutate: assign, loading: assignLoading, error: assignError } =
    useMutation(
      async (eventId) => {
        const { error } = await supabase
          .from("user_events")
          .insert({ user_id: userId, event_id: eventId });
        if (error) throw error;
        invalidateCache(`user-events-${userId}`);
        refetch();
      }
    );

  const {
    mutate: unassign,
    loading: unassignLoading,
    error: unassignError,
  } = useMutation(
    async (eventId) => {
      const { error } = await supabase
        .from("user_events")
        .delete()
        .eq("user_id", userId)
        .eq("event_id", eventId);
      if (error) throw error;
      invalidateCache(`user-events-${userId}`);
      refetch();
    }
  );

  return {
    eventIds,
    loading,
    error,
    assign,
    unassign,
    assignLoading,
    unassignLoading,
    assignError,
    unassignError,
  };
}
