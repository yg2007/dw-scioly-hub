import { useQuery } from "../lib/query";
import { supabase } from "../lib/supabase";
import { CACHE_TTL_DASHBOARD } from "../lib/constants";
import { IS_PRODUCTION } from "../lib/featureFlags";

/**
 * Fetch team-wide quiz attempt history and compute a weekly progress trend.
 *
 * Returns up to 10 weeks of data, each week showing:
 *   { label: "Mar 10", weekStart: Date, avgScore: number, attemptCount: number }
 *
 * Only includes weeks that have at least one attempt (no gap-filling with zeros).
 * In prototype mode returns null so the caller can use mock data instead.
 */
export function useTeamProgressTrend() {
  const { data, loading, error, refetch } = useQuery(
    "team-progress-trend",
    async () => {
      // Prototype mode — return null so the dashboard uses its mock fallback
      if (!IS_PRODUCTION) return null;
      // Fetch last 12 weeks of quiz attempts (score, total, completed_at)
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 84); // 12 weeks back

      const { data: attempts, error } = await supabase
        .from("quiz_attempts")
        .select("score, total, completed_at")
        .gte("completed_at", cutoff.toISOString())
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: true });

      if (error) throw error;
      if (!attempts || attempts.length === 0) return [];

      // ── Group by calendar week (Monday as week start) ────────────
      const weekMap = new Map(); // key = "YYYY-Www" → { sum, count, weekStart }

      for (const a of attempts) {
        if (!a.completed_at || !a.total || a.total === 0) continue;
        const dt = new Date(a.completed_at);
        // Shift to Monday of that week
        const day = dt.getDay(); // 0=Sun
        const diff = day === 0 ? -6 : 1 - day;
        const monday = new Date(dt);
        monday.setDate(dt.getDate() + diff);
        monday.setHours(0, 0, 0, 0);

        const key = monday.toISOString().split("T")[0]; // "2025-03-10"
        if (!weekMap.has(key)) {
          weekMap.set(key, { sum: 0, count: 0, weekStart: monday });
        }
        const bucket = weekMap.get(key);
        bucket.sum += (a.score / a.total) * 100;
        bucket.count += 1;
      }

      // ── Format for chart ──────────────────────────────────────────
      const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      return [...weekMap.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-10) // keep last 10 weeks with data
        .map(([, { sum, count, weekStart }]) => ({
          label: `${months[weekStart.getMonth()]} ${weekStart.getDate()}`,
          avgScore: Math.round(sum / count),
          attemptCount: count,
        }));
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
      const [statsRes, studentsRes] = await Promise.all([
        supabase.from("coach_dashboard_stats").select("*"),
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
