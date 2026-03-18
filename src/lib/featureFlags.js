// ═══════════════════════════════════════════════════════════════
//  Feature Flags — Toggle between prototype (mock) and production (Supabase)
//
//  Set VITE_MODE=production in .env to use real Supabase data.
//  Default is "prototype" which uses mock data for demos.
// ═══════════════════════════════════════════════════════════════

/** @type {'prototype' | 'production'} */
export const APP_MODE = import.meta.env.VITE_MODE === "production" ? "production" : "prototype";

/** True when using real Supabase backend */
export const IS_PRODUCTION = APP_MODE === "production";

/** True when using mock data for demos */
export const IS_PROTOTYPE = APP_MODE === "prototype";

/**
 * Individual feature toggles.
 * In prototype mode, AI features are disabled (they need a real API key).
 * Override any flag via VITE_FLAG_<NAME>=true in .env.
 */
export const FLAGS = {
  /** Use real Google OAuth instead of role-picker login */
  realAuth: IS_PRODUCTION || import.meta.env.VITE_FLAG_REAL_AUTH === "true",

  /** Use Supabase database instead of mock data arrays */
  realData: IS_PRODUCTION || import.meta.env.VITE_FLAG_REAL_DATA === "true",

  /** Enable AI quiz generation via Edge Function */
  aiQuizzes: IS_PRODUCTION || import.meta.env.VITE_FLAG_AI_QUIZZES === "true",

  /** Enable AI test analysis via Edge Function */
  aiTestAnalysis: IS_PRODUCTION || import.meta.env.VITE_FLAG_AI_TEST_ANALYSIS === "true",

  /** Enable realtime subscriptions (schedule, announcements) */
  realtime: IS_PRODUCTION || import.meta.env.VITE_FLAG_REALTIME === "true",

  /** Enable PWA service worker registration */
  pwa: IS_PRODUCTION || import.meta.env.VITE_FLAG_PWA === "true",
};
