import { useQuery } from "../lib/query";
import { supabase } from "../lib/supabase";
import { CACHE_TTL_DASHBOARD } from "../lib/constants";
import { IS_PRODUCTION } from "../lib/featureFlags";

/**
 * Fetch team-wide quiz attempt history and compute a weekly progress trend.
 *
 * Returns up to 10 weeks of data, each week showing:
 *   { label: "Mar 10", avg_score: number, attempt_count: number }
 *
 * Pre-aggregated by database function for performance.
 * In prototype mode returns null so the caller can use mock data instead.
 */
export function useTeamProgressTrend() {
  const { data, loading, error, refetch } = useQuery(
    "team-progress-trend",
    async () => {
      // Prototype mode — return null so the dashboard uses its mock fallback
      if (!IS_PRODUCTION) return null;

      const { data: trendData, error } = await supabase.rpc(
        "get_team_progress_trend",
        { p_weeks: 12 }
      );

      if (error) throw error;
      if (!trendData || trendData.length === 0) return [];

      // Return last 10 weeks with data, already formatted by the RPC
      return trendData.slice(-10);
    },
    { staleTime: CACHE_TTL_DASHBOARD }
  );

  return { trendData: data || null, loading, error, refetch };
}

/**
 * Fetch coach dashboard data including stats and assigned students
 * @returns {UseCoachDashboardResult} Dashboard stats, students list with loading/error states
 */
export function useCoachDashboard() {
  const { data: dashboardData, error, loading, refetch } = useQuery(
    "coach-dashboard",
    async () => {
      // Prototype mode — return empty arrays so the dashboard uses defaults
      if (!IS_PRODUCTION) {
        return {
          stats: [],
          students: [],
        };
      }

      const [statsRes, studentsRes] = await Promise.all([
        supabase.rpc("get_event_readiness_summary"),
        supabase
          .from("users")
          .select("*, user_events(event_id)")
          .eq("role", "student")
          .or("is_alumni.eq.false,is_alumni.is.null")   // exclude graduated alumni (NULL = not set = active)
          .order("full_name"),
      ]);

      if (statsRes.error) throw statsRes.error;
      if (studentsRes.error) throw studentsRes.error;

      const students = studentsRes.data.map((s) => ({
        ...s,
        events: (s.user_events || []).map((ue) => ue.event_id),
      }));

      return {
        stats: statsRes || [],
        students,
      };
    },
    { staleTime: CACHE_TTL_DASHBOARD }
  );

  return {
    stats: dashboardData?.stats || [],
    students: dashboardData?.students || [],
    loading,
    error,
    refetch,
  };
}

/**
 * Fetch all students list (for admin)
 * @returns {Object} All students with loading and error states
 */
export function useAllStudents() {
  const { data: students, error, loading, refetch } = useQuery(
    "all-students",
    async () => {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .or("is_alumni.eq.false,is_alumni.is.null")   // exclude graduated alumni from active lists
        .order("full_name");

      if (error) throw error;
      return data;
    },
    { staleTime: CACHE_TTL_DASHBOARD }
  );

  return {
    students: students || [],
    loading,
    error,
    refetch,
  };
}
