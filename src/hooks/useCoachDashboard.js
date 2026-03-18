import { useQuery } from "../lib/query";
import { supabase } from "../lib/supabase";
import { CACHE_TTL_DASHBOARD } from "../lib/constants";

/**
 * Fetch coach dashboard data including stats and assigned students
 * @returns {UseCoachDashboardResult} Dashboard stats, students list with loading/error states
 */
export function useCoachDashboard() {
  const { data: dashboardData, error, loading, refetch } = useQuery(
    "coach-dashboard",
    async () => {
      const [statsRes, studentsRes] = await Promise.all([
        supabase.from("coach_dashboard_stats").select("*"),
        supabase
          .from("users")
          .select("*, user_events(event_id)")
          .eq("role", "student")
          .order("full_name"),
      ]);

      if (statsRes.error) throw statsRes.error;
      if (studentsRes.error) throw studentsRes.error;

      const students = studentsRes.data.map((s) => ({
        ...s,
        events: (s.user_events || []).map((ue) => ue.event_id),
      }));

      return {
        stats: statsRes.data,
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
