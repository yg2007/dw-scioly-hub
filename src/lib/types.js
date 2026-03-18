/**
 * @typedef {Object} User
 * @property {string} id - User UUID
 * @property {string} email - User email address
 * @property {string} full_name - User full name
 * @property {string} initials - User initials (2 chars)
 * @property {string} role - User role (student, coach, admin)
 * @property {string} avatar_color - Hex color for avatar background
 */

/**
 * @typedef {Object} Event
 * @property {string} id - Event UUID
 * @property {string} name - Event name
 * @property {string} type - Event type (trial, regional, invitational, state, nationals)
 * @property {number} team_size - Expected team size for the event
 * @property {string} icon - Emoji icon representing the event
 * @property {boolean} is_trial - Whether this is a trial/practice event
 * @property {string[]} topics - Array of topic names for this event
 */

/**
 * @typedef {Object} QuizQuestion
 * @property {string} id - Question UUID
 * @property {string} q - Question text
 * @property {string[]} options - Array of answer options
 * @property {number} correct - Index of correct answer (0-based)
 * @property {string} topic - Topic this question covers
 * @property {number} difficulty - Difficulty level (1=easy, 2=medium, 3=hard)
 * @property {string} explanation - Explanation of correct answer
 */

/**
 * @typedef {Object} QuizAttempt
 * @property {string} id - Attempt UUID
 * @property {string} user_id - User UUID
 * @property {string} event_id - Event UUID
 * @property {number} score - Number of correct answers
 * @property {number} total - Total questions in attempt
 * @property {Array<{topic: string, correct: boolean}>} answers - Array of answers with correctness
 * @property {number} time_taken_seconds - Time spent on quiz
 * @property {string} [completed_at] - ISO timestamp when completed
 */

/**
 * @typedef {Object} TopicMastery
 * @property {string} id - Mastery record UUID
 * @property {string} user_id - User UUID
 * @property {string} event_id - Event UUID
 * @property {string} topic - Topic name
 * @property {number} score - Mastery score (0-100)
 * @property {string} trend - Score trend (up, down, stable)
 * @property {string} [updated_at] - ISO timestamp of last update
 */

/**
 * @typedef {Object} Partnership
 * @property {string} id - Partnership UUID
 * @property {string} event_id - Event UUID
 * @property {string} partner - Partner name
 * @property {string} self - Current user's name in partnership
 * @property {Object} event - Full Event object
 */

/**
 * @typedef {Object} BuildEntry
 * @property {string} id - Entry UUID
 * @property {string} description - What was built/done
 * @property {string} date - Date of build (YYYY-MM-DD)
 * @property {string} [imageUrl] - Optional image URL
 * @property {string} [notes] - Additional notes
 */

/**
 * @typedef {Object} BuildLog
 * @property {string} id - Log UUID
 * @property {string} user_id - User UUID
 * @property {string} event_id - Event UUID
 * @property {BuildEntry[]} entries - Array of build entries
 * @property {string} [created_at] - ISO timestamp
 * @property {string} [updated_at] - ISO timestamp
 */

/**
 * @typedef {Object} TestUpload
 * @property {string} id - Upload UUID
 * @property {string} user_id - User UUID
 * @property {string} event_id - Event UUID
 * @property {string} file_url - URL to uploaded scan/image
 * @property {string} file_type - MIME type of file
 * @property {number} file_size - File size in bytes
 * @property {string} [analysis] - Optional analysis results
 * @property {string} [created_at] - ISO timestamp
 */

/**
 * @typedef {Object} StudyPath
 * @property {string} id - Path UUID
 * @property {string} user_id - User UUID
 * @property {string} event_id - Event UUID
 * @property {string[]} topics - Array of topic names in this path
 * @property {number} progress - Progress percentage (0-100)
 * @property {string} [created_at] - ISO timestamp
 * @property {string} [updated_at] - ISO timestamp
 */

/**
 * @typedef {Object} PracticeSession
 * @property {string} id - Session UUID
 * @property {string} user_id - User UUID
 * @property {string} event_id - Event UUID
 * @property {string} topic - Topic studied
 * @property {number} duration_minutes - Session duration
 * @property {number} [score] - Optional score if quiz taken
 * @property {string} [created_at] - ISO timestamp
 */

/**
 * @typedef {Object} Announcement
 * @property {string} id - Announcement UUID
 * @property {string} event_id - Event UUID
 * @property {string} title - Announcement title
 * @property {string} content - Announcement content
 * @property {string} author_id - User UUID of author
 * @property {boolean} is_pinned - Whether pinned to top
 * @property {string} [created_at] - ISO timestamp
 * @property {string} [updated_at] - ISO timestamp
 */

/**
 * @typedef {Object} SynergyScoreBreakdown
 * @property {string} topic - Topic name
 * @property {number} coverage - Coverage percentage for this topic
 * @property {number} average_mastery - Average mastery across team
 */

/**
 * @typedef {Object} SynergyScore
 * @property {number} score - Overall synergy score (0-100)
 * @property {SynergyScoreBreakdown[]} breakdown - Per-topic breakdown
 * @property {number} coverage - Overall topic coverage percentage
 */

/**
 * Return type for useQuery hook
 * @typedef {Object} UseQueryResult
 * @property {any} data - Query result data (null while loading)
 * @property {string|null} error - Error message if query failed
 * @property {boolean} loading - True while query is in flight
 * @property {Function} refetch - Function to manually refetch data
 */

/**
 * Return type for useMutation hook
 * @typedef {Object} UseMutationResult
 * @property {Function} mutate - Function to execute mutation
 * @property {boolean} loading - True while mutation is executing
 * @property {string|null} error - Error message if mutation failed
 * @property {Function} reset - Function to clear error state
 */

/**
 * Return type for useEvents hook
 * @typedef {Object} UseEventsResult
 * @property {Event[]} events - Array of events
 * @property {boolean} loading - True while loading
 */

/**
 * Return type for useQuizQuestions hook
 * @typedef {Object} UseQuizQuestionsResult
 * @property {QuizQuestion[]} questions - Array of questions
 * @property {boolean} loading - True while loading
 */

/**
 * Return type for useQuizAttempts hook
 * @typedef {Object} UseQuizAttemptsResult
 * @property {QuizAttempt[]} attempts - Array of attempts
 * @property {boolean} loading - True while loading
 * @property {Function} submitAttempt - Function to submit a new attempt
 */

/**
 * Return type for useTopicMastery hook
 * @typedef {Object} UseTopicMasteryResult
 * @property {TopicMastery[]} mastery - Array of mastery records
 * @property {boolean} loading - True while loading
 */

/**
 * Return type for useUserEvents hook
 * @typedef {Object} UseUserEventsResult
 * @property {string[]} eventIds - Array of event IDs
 * @property {boolean} loading - True while loading
 * @property {Function} assign - Assign user to event
 * @property {Function} unassign - Unassign user from event
 */

/**
 * Return type for useBuildLogs hook
 * @typedef {Object} UseBuildLogsResult
 * @property {BuildLog[]} logs - Array of build logs
 * @property {boolean} loading - True while loading
 * @property {Function} addEntry - Add entry to log
 * @property {Function} deleteEntry - Delete entry from log
 */

/**
 * Return type for useTestUploads hook
 * @typedef {Object} UseTestUploadsResult
 * @property {TestUpload[]} uploads - Array of test uploads
 * @property {boolean} loading - True while loading
 * @property {Function} upload - Upload a test file
 */

/**
 * Return type for useCoachDashboard hook
 * @typedef {Object} UseCoachDashboardResult
 * @property {any} dashboard - Dashboard data
 * @property {boolean} loading - True while loading
 */

/**
 * Return type for usePartners hook
 * @typedef {Object} UsePartnersResult
 * @property {Partnership[]} partnerships - Array of partnerships
 * @property {boolean} loading - True while loading
 * @property {Function} addPartner - Add a partner
 * @property {Function} removePartner - Remove a partner
 */

/**
 * Return type for useStudyPaths hook
 * @typedef {Object} UseStudyPathsResult
 * @property {StudyPath[]} paths - Array of study paths
 * @property {boolean} loading - True while loading
 */

/**
 * Return type for useSchedule hook
 * @typedef {Object} UseScheduleResult
 * @property {any[]} schedule - Schedule items
 * @property {boolean} loading - True while loading
 */

export {};
