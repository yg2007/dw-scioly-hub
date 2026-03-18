import { useQuery, useMutation, invalidateCache } from "../lib/query";
import { supabase } from "../lib/supabase";
import { validateScanFile } from "../lib/validation";

/**
 * Fetch test uploads for a user (optionally filtered by event)
 * @param {string} userId - User UUID
 * @param {string} [eventId] - Optional event UUID to filter by
 * @returns {UseTestUploadsResult} Uploads list with uploadTest mutation
 */
export function useTestUploads(userId, eventId = null) {
  const { data: uploads, error, loading, refetch } = useQuery(
    `test-uploads-${userId}-${eventId || "all"}`,
    async () => {
      let query = supabase
        .from("test_uploads")
        .select("*")
        .eq("user_id", userId)
        .order("uploaded_at", { ascending: false });

      if (eventId) query = query.eq("event_id", eventId);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    { enabled: !!userId }
  );

  // Upload a test scan and optionally run AI analysis
  const {
    mutate: uploadTest,
    loading: uploading,
    error: uploadError,
  } = useMutation(
    async (file, evId, runAnalysis = true) => {
      validateScanFile(file); // Uses constants from lib
      const path = `${userId}/${evId}/${Date.now()}_${file.name}`;

      // Upload to storage
      const { error: uploadErr } = await supabase.storage
        .from("test-scans")
        .upload(path, file);
      if (uploadErr) throw uploadErr;

      // Create DB record
      const { data: record, error: insertErr } = await supabase
        .from("test_uploads")
        .insert({
          user_id: userId,
          event_id: evId,
          storage_path: path,
          file_name: file.name,
        })
        .select()
        .single();
      if (insertErr) throw insertErr;

      // Run AI analysis via Edge Function
      if (runAnalysis) {
        try {
          const { data: analysis, error: fnErr } =
            await supabase.functions.invoke("analyze-test", {
              body: {
                uploadId: record.id,
                storagePath: path,
                eventId: evId,
              },
            });
          if (fnErr) throw fnErr;

          // Update record with analysis results
          await supabase
            .from("test_uploads")
            .update({
              ai_analysis: analysis,
              score_earned: analysis.scoreEarned,
              score_total: analysis.scoreTotal,
            })
            .eq("id", record.id);
        } catch (analysisError) {
          console.error("Analysis error:", analysisError);
          // Continue anyway - record was created successfully
        }
      }

      invalidateCache(`test-uploads-${userId}-${eventId || "all"}`);
      refetch();

      return record;
    }
  );

  return {
    uploads: uploads || [],
    loading,
    error,
    uploadTest,
    uploading,
    uploadError,
    refetch,
  };
}
