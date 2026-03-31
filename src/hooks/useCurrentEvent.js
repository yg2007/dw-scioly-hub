// ═══════════════════════════════════════════════════════════════
//  useCurrentEvent — Resolves an event object from URL params
//
//  Replaces the old pattern where event objects were passed via
//  navigate("page", eventObject). Now events are resolved from
//  the :eventId URL parameter.
// ═══════════════════════════════════════════════════════════════

import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { EVENTS } from "../data/mockData";
import { IS_PRODUCTION } from "../lib/featureFlags";
import { useEvents } from "./useEvents";

/**
 * Resolves the current event from URL :eventId parameter.
 * Works in both prototype (mock data) and production (Supabase) modes.
 *
 * @returns {{ event: Object|null, loading: boolean }}
 */
export function useCurrentEvent() {
  const { eventId } = useParams();
  const { events: prodEvents, loading } = useEvents();

  const event = useMemo(() => {
    if (!eventId) return null;

    const id = Number(eventId);

    if (IS_PRODUCTION && prodEvents && prodEvents.length > 0) {
      return prodEvents.find((e) => e.id === id) || null;
    }

    // Prototype: look up from mock data
    return EVENTS.find((e) => e.id === id) || null;
  }, [eventId, prodEvents]);

  return { event, loading: IS_PRODUCTION ? loading : false };
}
