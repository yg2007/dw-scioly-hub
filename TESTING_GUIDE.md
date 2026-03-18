# Testing Guide for DW SciOly Hub

## Quick Start

### 1. Install Test Dependencies
If you haven't already installed dependencies:
```bash
cd /sessions/exciting-bold-hopper/mnt/Scioly-DW/dw-scioly-hub
npm install
```

### 2. Run All Tests
```bash
npm test
```

### 3. Watch Mode (Recommended for Development)
Tests will re-run automatically when you change files:
```bash
npm run test:watch
```

## Test Breakdown by Module

### Validation Tests (`src/__tests__/validation.test.js`)
Tests file uploads, quiz answers, and input sanitization.

**What it tests:**
- File upload size limits (photo: 10MB, scan: 20MB)
- File type validation (JPEG, PNG, WebP, PDF)
- Dangerous file extension blocking (.exe, .bat, .sh, .js, etc.)
- Quiz answer validation
- Topic name sanitization and HTML stripping

**Run specific test:**
```bash
npm test -- validation.test.js
```

### Mastery Tests (`src/__tests__/mastery.test.js`)
Tests topic mastery score calculation and trend detection.

**What it tests:**
- Mastery percentage calculation (0-100)
- Weighted average (60% new score, 40% old)
- Trend detection (up/down/stable based on ±3 threshold)
- Multiple topic handling
- Edge cases (no answers, existing scores, etc.)

**Run specific test:**
```bash
npm test -- mastery.test.js
```

### Mock Data Tests (`src/__tests__/mockData.test.js`)
Validates integrity of all mock data.

**What it tests:**
- All 23 Science Olympiad events exist
- Event structure (id, name, type, teamSize, icon, topics)
- Student data (names, initials, colors, event assignments)
- Partnership pairings
- Quiz bank questions (4 options each, valid difficulty levels)
- Cross-data consistency (all references are valid)

**Run specific test:**
```bash
npm test -- mockData.test.js
```

### Constants Tests (`src/__tests__/constants.test.js`)
Validates all application constants.

**What it tests:**
- File size limits are positive
- Rate limits are reasonable
- Mastery weights sum to 1.0
- Cache TTLs are valid (dashboard < events)
- UI constants (colors, border radius, transitions)
- Error messages are defined
- Enums (difficulty, roles, event types, trends)

**Run specific test:**
```bash
npm test -- constants.test.js
```

### Feature Flags Tests (`src/__tests__/featureFlags.test.js`)
Validates feature flag configuration.

**What it tests:**
- APP_MODE defaults to "prototype"
- IS_PRODUCTION and IS_PROTOTYPE are mutually exclusive
- FLAGS object has all 6 expected flags
- Flags are boolean values
- Mode consistency across all related values

**Run specific test:**
```bash
npm test -- featureFlags.test.js
```

## Understanding Test Results

### Passing Tests
```
✓ should pass validation for a valid file (2 ms)
```
Green checkmark means the test passed.

### Failing Tests
```
✗ should throw an error if no file is provided
  Expected error but did not throw
```
Red X means the test failed. The message explains why.

## Test Organization

Tests use standard structure:
```js
describe('Module Name', () => {
  describe('Specific Feature', () => {
    it('should do something specific', () => {
      // Arrange
      const input = "test data"

      // Act
      const result = functionUnderTest(input)

      // Assert
      expect(result).toBe("expected output")
    })
  })
})
```

## Debugging Tests

### Run Single Test File with Verbose Output
```bash
npm test -- validation.test.js --reporter=verbose
```

### Run Tests Matching a Pattern
```bash
npm test -- --grep "sanitizeTopicInput"
```

### Run with Watch Mode for TDD
```bash
npm run test:watch
```
This re-runs tests automatically as you edit files.

## Test Coverage

Current test suite covers:

| Module | Test Cases | Coverage |
|--------|-----------|----------|
| validation.js | 60+ | File uploads, input validation, sanitization |
| mastery.js | 40+ | Mastery calculation, trend detection |
| mockData.js | 50+ | Data structure integrity, cross-references |
| constants.js | 70+ | Value ranges, type checking, consistency |
| featureFlags.js | 25+ | Mode detection, flag configuration |
| **TOTAL** | **250+** | **Core functionality** |

## Common Issues

### "Cannot find module" error
Make sure you've run `npm install` to install all dependencies.

### Tests timeout
Increase timeout in vitest.config.js or specific test:
```js
it('should complete', async () => {
  // test code
}, { timeout: 5000 }) // 5 second timeout
```

### jsdom not found
Make sure `jsdom` is installed:
```bash
npm install --save-dev jsdom
```

## Best Practices

1. **Run tests before committing**: Catch bugs early
2. **Use watch mode during development**: Get instant feedback
3. **Write new tests for bug fixes**: Prevent regressions
4. **Test edge cases**: Empty strings, null values, boundary conditions
5. **Keep tests isolated**: Don't rely on test execution order

## Adding New Tests

When adding new features:

1. Create test file in `src/__tests__/featureName.test.js`
2. Follow existing pattern with describe/it blocks
3. Test both happy paths and error cases
4. Run `npm test` to verify
5. Commit with test code

Example new test:
```js
import { describe, it, expect } from 'vitest'
import { myNewFunction } from '../lib/myModule'

describe('myNewFunction', () => {
  it('should return correct value', () => {
    const result = myNewFunction("input")
    expect(result).toBe("expected")
  })
})
```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Best Practices](https://testing-library.com/docs/)
- [Jest Matchers](https://vitest.dev/api/expect.html) (Vitest uses similar API)

## Getting Help

1. Check test error messages (they're detailed and helpful)
2. Run tests with watch mode to see real-time feedback
3. Look at similar tests for patterns
4. Check function documentation in source files
