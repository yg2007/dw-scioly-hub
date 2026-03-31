import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { IS_PRODUCTION } from "../lib/featureFlags";
import { generateMastery, EVENTS } from "../data/mockData";

/**
 * Finds the student's weakest topic across all their assigned events.
 * Used to power the "Today's Focus" daily card on the student dashboard.
 *
 * In prototype mode: uses mock mastery data from generateMastery.
 * In production: queries topic_mastery ordered by score ascending.
 *
 * @param {Object} user - Current user object (needs .id and .events array)
 * @returns {{ focus: FocusItem|null, loading: boolean }}
 *
 * @typedef {Object} FocusItem
 * @property {string} eventId
 * @property {string} eventName
 * @property {string} eventIcon
 * @property {string|null} topic - Weakest topic name
 * @property {string|null} subtopic
 * @property {number|null} score - Mastery score 0-100
 * @property {string|null} trend - "up"|"down"|"stable"
 * @property {boolean} hasMastery - Whether any quiz data exists
 */
export function useTodaysFocus(user) {
  const [loading, setLoading] = useState(true);
  const [focus, setFocus] = useState(null);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    if (!IS_PRODUCTION) {
      // ── Prototype: derive from mock mastery ──────────────────
      const userEventIds = user.events || [];
      const userEvents = userEventIds
        .map((id) => EVENTS.find((e) => e.id === id))
        .filter(Boolean);

      let weakest = null;
      for (const ev of userEvents) {
        const mastery = generateMastery(user.id, ev.id) || [];
        for (const t of mastery) {
          if (!weakest || t.score < weakest.score) {
            weakest = {
              eventId: ev.id,
              eventName: ev.name,
              eventIcon: ev.icon || "📚",
              topic: t.topic,
              subtopic: t.subtopic || null,
              score: Math.round(t.score),
              trend: t.trend || "stable",
              hasMastery: true,
            };
          }
        }
      }

      // No mastery data yet — suggest first event
      if (!weakest && userEvents.length > 0) {
        const ev = userEvents[0];
        weakest = {
          eventId: ev.id,
          eventName: ev.name,
          eventIcon: ev.icon || "📚",
          topic: null,
          subtopic: null,
          score: null,
          trend: null,
          hasMastery: false,
        };
      }

      setFocus(weakest);
      setLoading(false);
      return;
    }

    // ── Production: query Supabase ─────────────────────────────
    const fetchFocus = async () => {
      const userEventIds = user.events || [];
      if (userEventIds.length === 0) {
        setFocus(null);
        setLoading(false);
        return;
      }

      // Fetch the single weakest topic across all assigned events
      const { data, error } = await supabase
        .from("topic_mastery")
        .select("event_id, topic, subtopic, score, trend")
        .eq("user_id", user.id)
        .in("event_id", userEventIds)
        .order("score", { ascending: true })
        .limit(1);

      if (error || !data || data.length === 0) {
        // No mastery data yet — suggest first event without a topic
        const { data: evData } = await supabase
          .from("events")
          .select("id, name, icon")
          .eq("id", userEventIds[0])
          .single();

        setFocus({
          eventId: userEventIds[0],
          eventName: evData?.name || "Your Event",
          eventIcon: evData?.icon || "📚",
          topic: null,
          subtopic: null,
          score: null,
          trend: null,
          hasMastery: false,
        });
        setLoading(false);
        return;
      }

      const row = data[0];

      // Fetch event name + icon
      const { data: evData } = await supabase
        .from("events")
        .select("id, name, icon")
        .eq("id", row.event_id)
        .single();

      setFocus({
        eventId: row.event_id,
        eventName: evData?.name || "Your Event",
        eventIcon: evData?.icon || "📚",
        topic: row.topic,
        subtopic: row.subtopic || null,
        score: Math.round(Number(row.score)),
        trend: row.trend || "stable",
        hasMastery: true,
      });
      setLoading(false);
    };

    fetchFocus();
  }, [user?.id, user?.events]);

  return { focus, loading };
}
