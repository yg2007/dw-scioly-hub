# DW SciOly Hub Test Suite Summary

## Overview
A comprehensive test suite has been created for the DW SciOly Hub project using Vitest, with full coverage of validation, mastery calculation, data integrity, constants, and feature flags.

## Test Files Created

### 1. vitest.config.js
Configuration file for Vitest with:
- jsdom environment for DOM testing
- Global test functions (describe, it, expect)
- React plugin integration

### 2. src/__tests__/validation.test.js (60+ test cases)
Tests all validation and sanitization functions:

**validateFile()**
- ✓ Passes valid files
- ✓ Rejects null/undefined files
- ✓ Rejects oversized files
- ✓ Rejects invalid file types
- ✓ Rejects dangerous extensions (.exe, .bat, .cmd, .sh, .ps1, .js, .html, .svg)
- ✓ Accepts safe file extensions
- ✓ Case-insensitive extension matching

**validatePhotoFile()**
- ✓ Accepts JPEG, PNG, WebP
- ✓ Rejects invalid types (PDF, etc.)
- ✓ Enforces photo size limit (10 MB)

**validateScanFile()**
- ✓ Accepts JPEG, PNG, WebP, PDF
- ✓ Enforces scan size limit (20 MB)

**validateQuizAnswers()**
- ✓ Accepts valid answer arrays
- ✓ Rejects non-array inputs
- ✓ Requires at least one answer
- ✓ Requires valid topic string for each answer
- ✓ Requires boolean correct field

**sanitizeTopicInput()**
- ✓ Preserves normal alphanumeric text
- ✓ Strips HTML tags and special characters
- ✓ Preserves & and - characters
- ✓ Preserves numbers
- ✓ Collapses multiple spaces
- ✓ Truncates to 100 characters
- ✓ Trims whitespace
- ✓ Rejects empty/invalid input
- ✓ Throws on empty result after sanitization

### 3. src/__tests__/mastery.test.js (40+ test cases)
Tests topic mastery calculation logic:

**Basic Score Calculation**
- ✓ All correct → 100
- ✓ All wrong → 0
- ✓ 50/50 → 50
- ✓ Various percentages calculated correctly
- ✓ Single answer handling

**Weighted Average (60% new, 40% old)**
- ✓ Correct weight application
- ✓ Weighted average for partial scores
- ✓ Mixed scenarios with existing scores

**Trend Detection (threshold: 3)**
- ✓ "up" trend when increase > 3
- ✓ "down" trend when decrease > 3
- ✓ "stable" trend for changes within ±3
- ✓ "stable" when no existing score

**Multiple Topics**
- ✓ Independent per-topic calculation
- ✓ Multiple distinct topics
- ✓ Correct trend per topic

**Edge Cases**
- ✓ Proper object structure with topic keys
- ✓ Scores rounded to 2 decimal places
- ✓ ExistingScore as 0 and 100
- ✓ null vs undefined handling
- ✓ Consistent results
- ✓ Realistic full quiz scenarios
- ✓ Improvement/decline trend detection

### 4. src/__tests__/mockData.test.js (50+ test cases)
Validates all mock data integrity:

**EVENTS (23 events)**
- ✓ Exactly 23 events exist
- ✓ All required fields present (id, name, type, teamSize, icon, topics)
- ✓ Valid event types only (study, lab, build)
- ✓ Unique event IDs
- ✓ Unique event names
- ✓ Positive team sizes
- ✓ Non-empty topic arrays with strings
- ✓ Valid emoji icons

**STUDENTS**
- ✓ All required fields present
- ✓ Unique student IDs
- ✓ Non-empty names
- ✓ Valid 2-character initials
- ✓ Valid hex color codes
- ✓ Valid event array with existing event IDs

**PARTNERSHIPS**
- ✓ Valid structure with eventId and partners
- ✓ Reference valid event IDs
- ✓ Reference valid student IDs
- ✓ Non-empty partner arrays

**QUIZ_BANK**
- ✓ Questions exist for valid events
- ✓ All required fields (q, options, correct, topic, difficulty, explanation)
- ✓ Exactly 4 options per question
- ✓ String options
- ✓ Correct index 0-3
- ✓ Difficulty levels 1-3
- ✓ Non-empty question text, topics, explanations
- ✓ Topics match event topics

**Cross-Data Consistency**
- ✓ All student event references valid
- ✓ All partnership events valid
- ✓ All partnership students valid
- ✓ Quiz topics reference valid event topics

### 5. src/__tests__/constants.test.js (70+ test cases)
Validates all constants:

**File Size Constants**
- ✓ MAX_PHOTO_SIZE_MB positive (10 MB)
- ✓ MAX_TEST_SCAN_SIZE_MB positive (20 MB)
- ✓ Scan > Photo size

**File Type Constants**
- ✓ Valid MIME type formats
- ✓ Scan types include all photo types

**Rate Limits**
- ✓ Positive integers
- ✓ Reasonable values (<1000)

**Mastery Weights**
- ✓ MASTERY_NEW_WEIGHT positive and ≤1
- ✓ MASTERY_OLD_WEIGHT positive and ≤1
- ✓ Sum to 1.0 (±0.00001)
- ✓ New weight > old weight (recency bias)
- ✓ Positive threshold

**Cache TTLs**
- ✓ All positive millisecond values
- ✓ Dashboard TTL < Events TTL
- ✓ Minimum 1 second

**UI Constants**
- ✓ Valid border radius (rem format)
- ✓ Increasing values (SM < MD < LG)
- ✓ Valid transition duration (ms format)

**Avatar Colors**
- ✓ Array with multiple colors
- ✓ Valid hex format (#RRGGBB)
- ✓ All unique colors

**Input Lengths**
- ✓ All positive integers
- ✓ Reasonable hierarchy

**Enums**
- ✓ Quiz difficulty (1=Easy, 2=Medium, 3=Hard)
- ✓ User roles (STUDENT, COACH, ADMIN)
- ✓ Event types (TRIAL, REGIONAL, INVITATIONAL, STATE, NATIONALS)
- ✓ Mastery trends (UP, DOWN, STABLE)

**Error Messages**
- ✓ All required keys present
- ✓ Non-empty strings

### 6. src/__tests__/featureFlags.test.js (25+ test cases)
Tests feature flag configuration:

**APP_MODE Detection**
- ✓ Value defined
- ✓ Either "prototype" or "production"
- ✓ Defaults to "prototype"

**IS_PRODUCTION & IS_PROTOTYPE**
- ✓ Boolean values
- ✓ True only in respective modes
- ✓ Mutually exclusive (exactly one true)

**FLAGS Object**
- ✓ Has all 6 expected flags
- ✓ All boolean values

**Flag Keys**
- ✓ realAuth
- ✓ realData
- ✓ aiQuizzes
- ✓ aiTestAnalysis
- ✓ realtime
- ✓ pwa

**Mode Consistency**
- ✓ Production mode enables all flags
- ✓ Prototype mode with overrides possible
- ✓ Flags match APP_MODE

## Running Tests

### Install Dependencies
```bash
npm install
```

### Run All Tests Once
```bash
npm test
```

### Watch Mode (Re-run on file changes)
```bash
npm run test:watch
```

## Test Statistics
- **Total Test Cases**: 250+
- **Test Files**: 5
- **Configuration**: 1
- **Lines of Test Code**: 1000+

## Coverage
The test suite covers:
- ✓ Input validation and sanitization
- ✓ File upload constraints
- ✓ Data structure integrity
- ✓ Mastery calculation algorithms
- ✓ Trend detection logic
- ✓ Mock data consistency
- ✓ Constant values and ranges
- ✓ Feature flag configuration
- ✓ Cross-data relationships

## Key Testing Patterns Used
- Positive and negative test cases
- Edge case handling
- Data type validation
- Boundary testing
- Cross-reference validation
- Consistency checks
- Environment-based configuration testing

## Notes
- Tests use Vitest with jsdom environment
- All tests run synchronously (no async needed for current functions)
- Mock data tests ensure 23 Science Olympiad Division B events
- Mastery tests validate weighted average (60% new, 40% old)
- Validation tests check against dangerous file extensions
- Feature flags follow environment variable pattern (VITE_*)
