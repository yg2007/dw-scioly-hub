import { useCallback } from "react";
import { useQuery, useMutation, invalidateCache } from "../lib/query";
import { supabase } from "../lib/supabase";
import { validatePhotoFile } from "../lib/validation";
import { MAX_PHOTO_SIZE_MB, ALLOWED_PHOTO_TYPES } from "../lib/constants";

/**
 * Fetch build logs and entries for a user + event
 * @param {string} userId - User UUID
 * @param {string} eventId - Event UUID
 * @returns {UseBuildLogsResult} Logs and entries with mutations for CRUD operations
 */
export function useBuildLogs(userId, eventId) {
  // Fetch build logs
  const { data: logs, error: logsError, loading, refetch: refetchLogs } =
    useQuery(
      `build-logs-${userId}-${eventId}`,
      async () => {
        const { data, error } = await supabase
          .from("build_logs")
          .select("*")
          .eq("user_id", userId)
          .eq("event_id", eventId)
          .order("created_at", { ascending: false });

        if (error) throw error;
        return data;
      },
      { enabled: !!userId && !!eventId }
    );

  // Fetch build entries for all logs
  const { data: entries, error: entriesError, loading: entriesLoading, refetch: refetchEntries } =
    useQuery(
      `build-entries-${userId}-${eventId}`,
      async () => {
        if (!logs || logs.length === 0) return [];

        const logIds = logs.map((l) => l.id);
        const { data, error } = await supabase
          .from("build_entries")
          .select("*")
          .in("build_log_id", logIds)
          .order("entry_date", { ascending: false });

        if (error) throw error;
        return data;
      },
      { enabled: !!logs && logs.length > 0 }
    );

  // Create a new build log
  const { mutate: createLog, loading: creatingLog, error: createError } =
    useMutation(
      async (title = "Build Log") => {
        const { data, error } = await supabase
          .from("build_logs")
          .insert({ event_id: eventId, user_id: userId, title })
          .select()
          .single();
        if (error) throw error;

        invalidateCache(`build-logs-${userId}-${eventId}`);
        refetchLogs();

        return data;
      }
    );

  // Add an entry to a log
  const { mutate: addEntry, loading: addingEntry, error: addError } =
    useMutation(
      async (buildLogId, { notes, measurements, photos, tags }) => {
        // Upload photos to storage if provided (with validation)
        const photoPaths = [];
        if (photos?.length) {
          for (const photo of photos) {
            validatePhotoFile(photo); // Uses constants from lib
            const path = `${userId}/${eventId}/${Date.now()}_${photo.name}`;
            const { error: uploadErr } = await supabase.storage
              .from("build-photos")
              .upload(path, photo);
            if (uploadErr) throw uploadErr;
            photoPaths.push(path);
          }
        }

        const { data, error } = await supabase
          .from("build_entries")
          .insert({
            build_log_id: buildLogId,
            notes,
            measurements: measurements || null,
            photo_paths: photoPaths.length ? photoPaths : null,
            tags: tags || null,
          })
          .select()
          .single();

        if (error) throw error;

        invalidateCache(`build-entries-${userId}-${eventId}`);
        refetchEntries();

        return data;
      }
    );

  // Delete an entry
  const { mutate: deleteEntry, loading: deletingEntry, error: deleteError } =
    useMutation(
      async (entryId) => {
        const { error } = await supabase
          .from("build_entries")
          .delete()
          .eq("id", entryId);
        if (error) throw error;

        invalidateCache(`build-entries-${userId}-${eventId}`);
        refetchEntries();
      }
    );

  // Get a signed URL for a photo
  const getPhotoUrl = useCallback(async (path) => {
    const { data } = await supabase.storage
      .from("build-photos")
      .createSignedUrl(path, 3600); // 1 hour expiry
    return data?.signedUrl;
  }, []);

  return {
    logs: logs || [],
    entries: entries || [],
    loading,
    entriesLoading,
    error: logsError || entriesError,
    createLog,
    creatingLog,
    createError,
    addEntry,
    addingEntry,
    addError,
    deleteEntry,
    deletingEntry,
    deleteError,
    getPhotoUrl,
  };
}
