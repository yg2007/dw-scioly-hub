import { useQuery, useMutation, invalidateCache } from "../lib/query";
import { supabase } from "../lib/supabase";

/**
 * Fetch and manage study paths for a user
 * Handles both reading study paths and updating progress
 * @param {string} userId - User UUID
 * @returns {UseStudyPathsResult} Study paths with updateProgress mutation
 */
export function useStudyPaths(userId) {
  const { data: paths, error, loading, refetch } = useQuery(
    `study-paths-${userId}`,
    async () => {
      const { data, error } = await supabase
        .from("study_paths")
        .select("*, events(name, icon, type)")
        .eq("user_id", userId);

      if (error) throw error;
      return data;
    },
    { enabled: !!userId }
  );

  // Use mutation for updates (avoids stale closure on paths array)
  const {
    mutate: updateProgress,
    loading: updating,
    error: updateError,
  } = useMutation(
    async (eventId, stage, progress) => {
      // Fetch fresh state to avoid stale closure
      const { data: existingPaths } = await supabase
        .from("study_paths")
        .select("*")
        .eq("user_id", userId)
        .eq("event_id", eventId)
        .single();

      if (existingPaths) {
        const newStageProgress = {
          ...existingPaths.stage_progress,
          [stage]: progress,
        };
        const { error } = await supabase
          .from("study_paths")
          .update({
            current_stage: stage,
            stage_progress: newStageProgress,
            last_activity_at: new Date().toISOString(),
          })
          .eq("id", existingPaths.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("study_paths")
          .insert({
            user_id: userId,
            event_id: eventId,
            current_stage: stage,
            stage_progress: {
              foundation: 0,
              application: 0,
              mastery: 0,
              competition: 0,
              [stage]: progress,
            },
          });
        if (error) throw error;
      }

      invalidateCache(`study-paths-${userId}`);
      refetch();
    }
  );

  return {
    paths: paths || [],
    loading,
    error,
    updateProgress,
    updating,
    updateError,
    refetch,
  };
}
