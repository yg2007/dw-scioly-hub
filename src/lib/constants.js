// ─── File Upload Constraints ─────────────────────────────────
export const MAX_PHOTO_SIZE_MB = 10;
export const MAX_TEST_SCAN_SIZE_MB = 20;

export const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const ALLOWED_SCAN_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

// ─── Rate Limits ──────────────────────────────────────────────
export const QUIZ_RATE_LIMIT_PER_HOUR = 30;
export const ANALYSIS_RATE_LIMIT_PER_HOUR = 10;

// ─── Quiz Constraints ─────────────────────────────────────────
export const MAX_QUIZ_COUNT = 20;

// ─── Topic Mastery Weights ────────────────────────────────────
/**
 * Weight for new quiz attempt score in mastery calculation (recency bias)
 * Final score = (newScore * MASTERY_NEW_WEIGHT) + (oldScore * MASTERY_OLD_WEIGHT)
 */
export const MASTERY_NEW_WEIGHT = 0.6;

/**
 * Weight for existing mastery score in weighted average
 * Should sum to 1.0 with MASTERY_NEW_WEIGHT
 */
export const MASTERY_OLD_WEIGHT = 0.4;

/**
 * Threshold for trend detection in mastery scores
 * Trend is "up" if score increases by more than this, "down" if decreases by more
 */
export const MASTERY_TREND_THRESHOLD = 3;

// ─── Cache TTLs (in milliseconds) ────────────────────────────
/** 5 minutes - for events list (changes rarely) */
export const CACHE_TTL_EVENTS = 300000;

/** 5 minutes - for quiz questions (don't change during session) */
export const CACHE_TTL_QUIZ_QUESTIONS = 300000;

/** 1 minute - for dashboard (frequently updated) */
export const CACHE_TTL_DASHBOARD = 60000;

// ─── Pagination ───────────────────────────────────────────────
/** Page size for announcements feed */
export const ANNOUNCEMENTS_PAGE_SIZE = 20;

// ─── UI Constants ──────────────────────────────────────────────
/** Standard border radius in tailwind (convert to match your design system) */
export const BORDER_RADIUS_SM = "0.375rem";
export const BORDER_RADIUS_MD = "0.5rem";
export const BORDER_RADIUS_LG = "0.75rem";

/** Standard transition duration */
export const TRANSITION_DURATION = "150ms";

// ─── Colors (for avatars, badges, etc) ────────────────────────
export const AVATAR_COLORS = [
  "#EC4899", // pink
  "#F43F5E", // rose
  "#EF4444", // red
  "#F97316", // orange
  "#EAB308", // yellow
  "#22C55E", // green
  "#10B981", // emerald
  "#14B8A6", // teal
  "#06B6D4", // cyan
  "#0EA5E9", // sky
  "#3B82F6", // blue
  "#6366F1", // indigo
  "#8B5CF6", // violet
  "#A855F7", // purple
];

/** Default event icon if none specified */
export const DEFAULT_EVENT_ICON = "📚";

// ─── API & Database ───────────────────────────────────────────
/** Maximum length for text inputs in forms */
export const MAX_TEXT_INPUT_LENGTH = 500;

/** Maximum length for topic names */
export const MAX_TOPIC_NAME_LENGTH = 100;

/** Maximum length for event names */
export const MAX_EVENT_NAME_LENGTH = 200;

// ─── Error Messages ───────────────────────────────────────────
export const ERROR_MESSAGES = {
  FILE_TOO_LARGE: "File is too large. Please upload a smaller file.",
  INVALID_FILE_TYPE: "File type not allowed. Please upload an image or PDF.",
  NETWORK_ERROR: "Network error. Please check your connection and try again.",
  UNAUTHORIZED: "You don't have permission to perform this action.",
  NOT_FOUND: "The requested item was not found.",
  RATE_LIMITED: "Too many requests. Please wait a moment and try again.",
  SERVER_ERROR: "Server error. Please try again later.",
  VALIDATION_ERROR: "Please check your input and try again.",
};

// ─── Quiz Difficulty Levels ───────────────────────────────────
export const QUIZ_DIFFICULTY = {
  EASY: 1,
  MEDIUM: 2,
  HARD: 3,
};

export const QUIZ_DIFFICULTY_LABELS = {
  1: "Easy",
  2: "Medium",
  3: "Hard",
};

// ─── User Roles ───────────────────────────────────────────────
export const USER_ROLES = {
  STUDENT: "student",
  COACH: "coach",
  ADMIN: "admin",
};

// ─── Event Types ──────────────────────────────────────────────
export const EVENT_TYPES = {
  TRIAL: "trial",
  REGIONAL: "regional",
  INVITATIONAL: "invitational",
  STATE: "state",
  NATIONALS: "nationals",
};

// ─── Trend Values ────────────────────────────────────────────
export const MASTERY_TRENDS = {
  UP: "up",
  DOWN: "down",
  STABLE: "stable",
};
