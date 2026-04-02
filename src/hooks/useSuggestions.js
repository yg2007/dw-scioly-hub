import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";

/**
 * Hook for the Suggestions Log feature.
 * Loads all suggestions with author info + current user's votes.
 * Provides create, vote/unvote, and status update mutations.
 */
export function useSuggestions(currentUserId) {
  const [suggestions, setSuggestions] = useState([]);
  const [myVotes, setMyVotes] = useState(new Set()); // Set of suggestion_ids I've voted for
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!supabase || !currentUserId) return;
    setLoading(true);
    setError(null);
    try {
      // Fetch suggestions with author name (use explicit FK constraint to avoid ambiguity)
      const { data: sugData, error: sugErr } = await supabase
        .from("suggestions")
        .select("*, author:users!suggestions_author_id_public_users_fk(full_name, avatar_color, role)")
        .order("vote_count", { ascending: false });
      if (sugErr) throw sugErr;

      // Fetch my votes
      const { data: voteData, error: voteErr } = await supabase
        .from("suggestion_votes")
        .select("suggestion_id")
        .eq("user_id", currentUserId);
      if (voteErr) throw voteErr;

      setSuggestions(sugData || []);
      setMyVotes(new Set((voteData || []).map((v) => v.suggestion_id)));
    } catch (err) {
      console.error("useSuggestions load:", err);
      setError("Failed to load suggestions");
    }
    setLoading(false);
  }, [currentUserId]);

  useEffect(() => {
    load();
  }, [load]);

  // ── Create ──
  const createSuggestion = useCallback(
    async ({ title, description }) => {
      // Step 1: Insert the suggestion
      const { data: inserted, error: insertErr } = await supabase
        .from("suggestions")
        .insert({ author_id: currentUserId, title, description: description || "" })
        .select("*")
        .single();
      if (insertErr) throw insertErr;

      // Step 2: Fetch it back with the author join (separate query avoids FK ambiguity)
      const { data: full, error: fetchErr } = await supabase
        .from("suggestions")
        .select("*, author:users!suggestions_author_id_public_users_fk(full_name, avatar_color, role)")
        .eq("id", inserted.id)
        .single();

      const result = fetchErr ? { ...inserted, author: null } : full;
      setSuggestions((prev) => [result, ...prev]);
      return result;
    },
    [currentUserId]
  );

  // ── Vote / Unvote ──
  const toggleVote = useCallback(
    async (suggestionId) => {
      const hasVoted = myVotes.has(suggestionId);

      if (hasVoted) {
        // Remove vote
        const { error: err } = await supabase
          .from("suggestion_votes")
          .delete()
          .eq("suggestion_id", suggestionId)
          .eq("user_id", currentUserId);
        if (err) throw err;
        setMyVotes((prev) => {
          const next = new Set(prev);
          next.delete(suggestionId);
          return next;
        });
        setSuggestions((prev) =>
          prev.map((s) =>
            s.id === suggestionId ? { ...s, vote_count: Math.max(0, s.vote_count - 1) } : s
          )
        );
      } else {
        // Add vote
        const { error: err } = await supabase
          .from("suggestion_votes")
          .insert({ suggestion_id: suggestionId, user_id: currentUserId });
        if (err) throw err;
        setMyVotes((prev) => new Set(prev).add(suggestionId));
        setSuggestions((prev) =>
          prev.map((s) =>
            s.id === suggestionId ? { ...s, vote_count: s.vote_count + 1 } : s
          )
        );
      }
    },
    [currentUserId, myVotes]
  );

  // ── Update status (coach/admin) ──
  const updateStatus = useCallback(async (suggestionId, status) => {
    const { error: err } = await supabase
      .from("suggestions")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", suggestionId);
    if (err) throw err;
    setSuggestions((prev) =>
      prev.map((s) => (s.id === suggestionId ? { ...s, status } : s))
    );
  }, []);

  return {
    suggestions,
    myVotes,
    loading,
    error,
    createSuggestion,
    toggleVote,
    updateStatus,
    refresh: load,
  };
}
