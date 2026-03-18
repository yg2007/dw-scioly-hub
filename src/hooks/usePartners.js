import { useQuery } from "../lib/query";
import { supabase } from "../lib/supabase";

/**
 * Fetch partnerships for a user
 * @param {string} userId - User UUID
 * @returns {UsePartnersResult} Partnerships list with loading and error states
 */
export function usePartners(userId) {
  const { data: partnerships, error, loading, refetch } = useQuery(
    `partners-${userId}`,
    async () => {
      // Get partnerships where user is either partner_a or partner_b
      const { data, error } = await supabase
        .from("partnerships")
        .select(
          `
          id,
          event_id,
          partner_a,
          partner_b,
          events(name, icon, type),
          a:users!partnerships_partner_a_fkey(id, full_name, initials, avatar_color),
          b:users!partnerships_partner_b_fkey(id, full_name, initials, avatar_color)
        `
        )
        .or(`partner_a.eq.${userId},partner_b.eq.${userId}`);

      if (error) throw error;

      // Transform: identify partner (the other person)
      return data.map((p) => ({
        id: p.id,
        eventId: p.event_id,
        event: p.events,
        partner: p.partner_a === userId ? p.b : p.a,
        self: p.partner_a === userId ? p.a : p.b,
      }));
    },
    { enabled: !!userId }
  );

  return { partnerships: partnerships || [], loading, error, refetch };
}

/**
 * Compute synergy score between two partners for an event
 * @param {string} partnerAId - First partner's user UUID
 * @param {string} partnerBId - Second partner's user UUID
 * @param {string} eventId - Event UUID
 * @returns {Object} Synergy score with breakdown and loading states
 */
export function useSynergyScore(partnerAId, partnerBId, eventId) {
  const { data: synergy, error, loading, refetch } = useQuery(
    `synergy-${partnerAId}-${partnerBId}-${eventId}`,
    async () => {
      // Fetch mastery for both partners
      const [{ data: masteryA }, { data: masteryB }] = await Promise.all([
        supabase
          .from("topic_mastery")
          .select("topic, score")
          .eq("user_id", partnerAId)
          .eq("event_id", eventId),
        supabase
          .from("topic_mastery")
          .select("topic, score")
          .eq("user_id", partnerBId)
          .eq("event_id", eventId),
      ]);

      if (!masteryA?.length && !masteryB?.length) {
        return { score: 0, breakdown: [], coverage: 0 };
      }

      const mapA = Object.fromEntries((masteryA || []).map((m) => [m.topic, m.score]));
      const mapB = Object.fromEntries((masteryB || []).map((m) => [m.topic, m.score]));
      const allTopics = [...new Set([...Object.keys(mapA), ...Object.keys(mapB)])];

      // Synergy = combined coverage with complementary bonus
      const breakdown = allTopics.map((topic) => {
        const a = mapA[topic] || 0;
        const b = mapB[topic] || 0;
        const combined = Math.min(100, Math.max(a, b) + Math.min(a, b) * 0.3);
        return { topic, scoreA: a, scoreB: b, combined };
      });

      const avgCombined =
        breakdown.reduce((s, t) => s + t.combined, 0) / breakdown.length;
      const coverage = (allTopics.length / Math.max(allTopics.length, 1)) * 100;

      return {
        score: Math.round(avgCombined),
        breakdown,
        coverage: Math.round(coverage),
      };
    },
    { enabled: !!partnerAId && !!partnerBId && !!eventId }
  );

  return {
    synergy: synergy || { score: 0, breakdown: [], coverage: 0 },
    loading,
    error,
    refetch,
  };
}
