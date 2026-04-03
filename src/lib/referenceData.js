/**
 * Reference data prefetching and caching
 *
 * Stable reference data (events, topics, etc.) that rarely changes
 * is prefetched after login and cached in-memory for the session.
 * This avoids redundant API calls across the app.
 */

import { supabase } from "./supabase";

// In-memory cache for reference data that rarely changes
const refCache = new Map();

/**
 * Prefetch stable reference data (events, topics) after login.
 * These change very rarely and can be cached for the entire session.
 *
 * Safe to call multiple times — subsequent calls are no-ops if already cached.
 */
export async function prefetchReferenceData() {
  // Don't refetch if already cached
  if (refCache.has("events") && refCache.has("event-topics")) return;

  try {
    const [eventsRes, topicsRes] = await Promise.all([
      supabase.from("events").select("id, name, icon, type, team_size").order("name"),
      supabase.from("event_topics").select("id, event_id, topic_name").order("event_id"),
    ]);

    if (eventsRes.data) refCache.set("events", eventsRes.data);
    if (topicsRes.data) refCache.set("event-topics", topicsRes.data);
  } catch (err) {
    console.warn("[prefetchReferenceData] Failed:", err.message);
  }
}

/**
 * Read cached events synchronously (for instant display).
 * Returns empty array if not yet prefetched.
 *
 * @returns {Array} Events array
 */
export function getEvents() {
  return refCache.get("events") || [];
}

/**
 * Read cached event topics synchronously (for instant display).
 * Returns empty array if not yet prefetched.
 *
 * @returns {Array} Event topics array
 */
export function getEventTopics() {
  return refCache.get("event-topics") || [];
}

/**
 * Clear all cached reference data (called on logout).
 */
export function clearReferenceCache() {
  refCache.clear();
}

/**
 * Get topics for a specific event from cache.
 *
 * @param {number} eventId - The event ID
 * @returns {Array} Topics for that event
 */
export function getEventTopicsForId(eventId) {
  const topics = refCache.get("event-topics") || [];
  return topics.filter(t => t.event_id === eventId);
}
