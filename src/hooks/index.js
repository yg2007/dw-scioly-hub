/**
 * Barrel exports for all application hooks
 * Each hook uses shared useQuery/useMutation utilities from lib/query.js
 * and follows consistent patterns for error handling and caching
 */

export { useEvents, useUserEvents } from "./useEvents";
export {
  useQuizQuestions,
  useAIQuiz,
  useQuizAttempts,
  useTopicMastery,
} from "./useQuizzes";
export { useBuildLogs } from "./useBuildLogs";
export { usePartners, useSynergyScore } from "./usePartners";
export { useStudyPaths } from "./useStudyPaths";
export { useTestUploads } from "./useTestUploads";
export { useSchedule, useAnnouncements } from "./useSchedule";
export { useCoachDashboard, useAllStudents } from "./useCoachDashboard";
export { useTeamManagement } from "./useTeamManagement";
export { useCompetitions } from "./useCompetitions";
export { useCurrentEvent } from "./useCurrentEvent";

// Unified hooks — abstract away IS_PRODUCTION branching
export {
  useUnifiedEvents,
  useUnifiedMastery,
  useUnifiedQuizStats,
  useUnifiedPartnerships,
  useUnifiedQuizQuestions,
  useUnifiedStudents,
} from "./useUnifiedData";
