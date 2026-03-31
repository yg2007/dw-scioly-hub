import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";

/**
 * Hook for managing competition dates (invitationals, regionals, state, etc.)
 * Admin/coach can create, update, delete. All authenticated users can view.
 */
export function useCompetitions() {
  const [competitions, setCompetitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from("competitions")
        .select("*")
        .order("date", { ascending: true });
      if (err) throw err;
      setCompetitions(data || []);
    } catch (err) {
      console.error("useCompetitions load:", err);
      setError("Failed to load competitions");
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const createCompetition = useCallback(async (comp) => {
    const { data, error: err } = await supabase
      .from("competitions")
      .insert(comp)
      .select()
      .single();
    if (err) throw err;
    setCompetitions((prev) => [...prev, data].sort((a, b) => a.date.localeCompare(b.date)));
    return data;
  }, []);

  const updateCompetition = useCallback(async (id, updates) => {
    const { data, error: err } = await supabase
      .from("competitions")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (err) throw err;
    setCompetitions((prev) =>
      prev.map((c) => (c.id === id ? data : c)).sort((a, b) => a.date.localeCompare(b.date))
    );
    return data;
  }, []);

  const deleteCompetition = useCallback(async (id) => {
    const { error: err } = await supabase
      .from("competitions")
      .delete()
      .eq("id", id);
    if (err) throw err;
    setCompetitions((prev) => prev.filter((c) => c.id !== id));
  }, []);

  return {
    competitions,
    loading,
    error,
    createCompetition,
    updateCompetition,
    deleteCompetition,
    refresh: load,
  };
}
