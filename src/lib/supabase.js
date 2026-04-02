import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Missing Supabase env vars. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env. " +
    "Running in prototype mode — Supabase calls will return empty results."
  );
}

// Always create a client so hooks never crash on null.
// In prototype mode (no env vars), queries fail silently and hooks return empty data.
export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder",
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
);

// ─── Refresh session when user returns to the tab ────────────
// Supabase auto-refresh runs on a timer, but if the browser throttles
// the tab (common on mobile / background tabs), the refresh can miss
// its window and the JWT expires. This forces a refresh on visibility.
let _refreshInFlight = null;
export function ensureFreshSession() {
  if (_refreshInFlight) return _refreshInFlight;
  _refreshInFlight = supabase.auth.refreshSession().finally(() => {
    _refreshInFlight = null;
  });
  return _refreshInFlight;
}

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      ensureFreshSession();
    }
  });
}

// ─── Resilient query helper ──────────────────────────────────
// Wraps any async function that returns { data, error } (Supabase pattern)
// and retries once with a fresh token if it gets an auth error.
function isAuthError(err) {
  if (!err) return false;
  const msg = (err.message || "").toLowerCase();
  const code = err.code || "";
  return (
    code === "PGRST301" || code === "401" || code === "403" ||
    msg.includes("jwt expired") ||
    msg.includes("token is expired") ||
    msg.includes("invalid claim") ||
    msg.includes("not authenticated") ||
    msg.includes("permission denied")
  );
}

/**
 * Execute a Supabase query with automatic token refresh on auth failure.
 * Usage:  const { data, error } = await resilientQuery(() =>
 *           supabase.from("users").select("*").eq("role", "student")
 *         );
 *
 * The callback should return a Supabase query builder (thenable).
 * On auth error, refreshes the session and retries once.
 */
export async function resilientQuery(queryFn) {
  const result = await queryFn();
  if (result.error && isAuthError(result.error)) {
    console.warn("[resilientQuery] Auth error, refreshing session and retrying:", result.error.message);
    try {
      await ensureFreshSession();
    } catch (_) { /* refresh failed, still try the query */ }
    // Retry once with fresh token
    return await queryFn();
  }
  return result;
}
