import {
  MAX_PHOTO_SIZE_MB,
  MAX_TEST_SCAN_SIZE_MB,
  ALLOWED_PHOTO_TYPES,
  ALLOWED_SCAN_TYPES,
  MAX_TOPIC_NAME_LENGTH,
  ERROR_MESSAGES,
} from "./constants.js";

// ─── Client-side file validation ─────────────────────────────
/**
 * Validate a file upload
 * @param {File} file - File object to validate
 * @param {number} maxSizeMB - Maximum file size in MB
 * @param {string[]} allowedTypes - Array of allowed MIME types
 * @returns {boolean} True if valid
 * @throws {Error} If file is invalid
 */
export function validateFile(file, maxSizeMB = 10, allowedTypes = []) {
  if (!file || !file.name) {
    throw new Error("No file provided");
  }

  if (maxSizeMB && file.size > maxSizeMB * 1024 * 1024) {
    throw new Error(`File too large. Maximum size: ${maxSizeMB}MB`);
  }

  if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
    throw new Error(
      `Invalid file type "${file.type}". Allowed: ${allowedTypes.join(", ")}`
    );
  }

  // Block potentially dangerous extensions
  const dangerousExts = [".exe", ".bat", ".cmd", ".sh", ".ps1", ".js", ".html", ".svg"];
  const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  if (dangerousExts.includes(ext)) {
    throw new Error(`File extension "${ext}" is not allowed`);
  }

  return true;
}

/**
 * Validate a photo file for upload
 * @param {File} file - Photo file to validate
 * @returns {boolean} True if valid
 * @throws {Error} If photo is invalid
 */
export function validatePhotoFile(file) {
  return validateFile(file, MAX_PHOTO_SIZE_MB, ALLOWED_PHOTO_TYPES);
}

/**
 * Validate a test scan file for upload
 * @param {File} file - Scan file to validate
 * @returns {boolean} True if valid
 * @throws {Error} If scan is invalid
 */
export function validateScanFile(file) {
  return validateFile(file, MAX_TEST_SCAN_SIZE_MB, ALLOWED_SCAN_TYPES);
}

/**
 * Validate quiz answers array
 * @param {Array<{topic: string, correct: boolean}>} answers - Array of answers
 * @returns {boolean} True if valid
 * @throws {Error} If answers are invalid
 *
 * @example
 * validateQuizAnswers([
 *   { topic: "Biology", correct: true },
 *   { topic: "Chemistry", correct: false }
 * ])
 */
export function validateQuizAnswers(answers) {
  if (!Array.isArray(answers)) {
    throw new Error("Answers must be an array");
  }

  if (answers.length === 0) {
    throw new Error("At least one answer is required");
  }

  for (const answer of answers) {
    if (!answer.topic || typeof answer.topic !== "string") {
      throw new Error("Each answer must have a valid topic string");
    }

    if (typeof answer.correct !== "boolean") {
      throw new Error("Each answer must have a correct boolean value");
    }
  }

  return true;
}

/**
 * Sanitize and validate topic input
 * Strips non-alphanumeric characters except spaces, &, and hyphens
 * Caps at MAX_TOPIC_NAME_LENGTH characters
 *
 * @param {string} topic - Raw topic input
 * @returns {string} Sanitized topic string
 * @throws {Error} If topic is empty or invalid
 *
 * @example
 * sanitizeTopicInput("Bio@logy & Che#mistry")
 * // Returns: "Biology & Chemistry"
 */
export function sanitizeTopicInput(topic) {
  if (!topic || typeof topic !== "string") {
    throw new Error("Topic must be a non-empty string");
  }

  // Strip HTML tags, then non-alphanumeric except spaces, &, and hyphens
  let sanitized = topic
    .replace(/<[^>]*>?/gm, "")
    .replace(/[^a-zA-Z0-9\s&-]/g, "")
    .trim()
    .substring(0, MAX_TOPIC_NAME_LENGTH);

  // Collapse multiple spaces
  sanitized = sanitized.replace(/\s+/g, " ");

  if (!sanitized) {
    throw new Error("Topic cannot be empty after sanitization");
  }

  return sanitized;
}
