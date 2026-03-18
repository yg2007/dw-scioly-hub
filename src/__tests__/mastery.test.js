import { describe, it, expect } from 'vitest'
import { calculateMastery } from '../lib/mastery'

describe('calculateMastery', () => {
  describe('basic score calculation', () => {
    it('should score 100 when all answers are correct', () => {
      const answers = [
        { topic: 'Biology', correct: true },
        { topic: 'Biology', correct: true },
        { topic: 'Biology', correct: true },
      ]
      const result = calculateMastery(answers)
      expect(result.Biology.score).toBe(100)
    })

    it('should score 0 when all answers are incorrect', () => {
      const answers = [
        { topic: 'Biology', correct: false },
        { topic: 'Biology', correct: false },
        { topic: 'Biology', correct: false },
      ]
      const result = calculateMastery(answers)
      expect(result.Biology.score).toBe(0)
    })

    it('should score 50 for 50/50 correct answers', () => {
      const answers = [
        { topic: 'Biology', correct: true },
        { topic: 'Biology', correct: false },
      ]
      const result = calculateMastery(answers)
      expect(result.Biology.score).toBe(50)
    })

    it('should calculate correct percentage for various ratios', () => {
      const answers = [
        { topic: 'Biology', correct: true },
        { topic: 'Biology', correct: true },
        { topic: 'Biology', correct: false },
      ]
      const result = calculateMastery(answers)
      expect(result.Biology.score).toBeCloseTo(66.67, 1)
    })

    it('should handle single answer', () => {
      const answers = [{ topic: 'Biology', correct: true }]
      const result = calculateMastery(answers)
      expect(result.Biology.score).toBe(100)
    })
  })

  describe('weighted average with existing score', () => {
    it('should apply 60% weight to new score and 40% to old score', () => {
      const answers = [{ topic: 'Biology', correct: true }] // 100% new
      const existingScore = 50
      const result = calculateMastery(answers, existingScore)
      // (100 * 0.6) + (50 * 0.4) = 60 + 20 = 80
      expect(result.Biology.score).toBe(80)
    })

    it('should calculate weighted average correctly', () => {
      const answers = [
        { topic: 'Chemistry', correct: true },
        { topic: 'Chemistry', correct: false },
      ] // 50% new
      const existingScore = 70
      const result = calculateMastery(answers, existingScore)
      // (50 * 0.6) + (70 * 0.4) = 30 + 28 = 58
      expect(result.Chemistry.score).toBe(58)
    })

    it('should handle all correct with existing low score', () => {
      const answers = [
        { topic: 'Physics', correct: true },
        { topic: 'Physics', correct: true },
      ]
      const existingScore = 20
      const result = calculateMastery(answers, existingScore)
      // (100 * 0.6) + (20 * 0.4) = 60 + 8 = 68
      expect(result.Physics.score).toBe(68)
    })
  })

  describe('trend detection', () => {
    it('should mark trend as "up" when score increases by more than threshold (3)', () => {
      const answers = [{ topic: 'Biology', correct: true }] // 100
      const existingScore = 95
      const result = calculateMastery(answers, existingScore)
      // New weighted = (100 * 0.6) + (95 * 0.4) = 60 + 38 = 98
      // 98 > 95 + 3, so trend is up
      expect(result.Biology.trend).toBe('up')
    })

    it('should mark trend as "down" when score decreases by more than threshold (3)', () => {
      const answers = [{ topic: 'Biology', correct: false }] // 0
      const existingScore = 90
      const result = calculateMastery(answers, existingScore)
      // New weighted = (0 * 0.6) + (90 * 0.4) = 0 + 36 = 36
      // 36 < 90 - 3, so trend is down
      expect(result.Biology.trend).toBe('down')
    })

    it('should mark trend as "stable" for small changes within threshold', () => {
      const answers = [
        { topic: 'Biology', correct: true },
        { topic: 'Biology', correct: true },
        { topic: 'Biology', correct: true },
        { topic: 'Biology', correct: true },
      ] // 100
      const existingScore = 98
      const result = calculateMastery(answers, existingScore)
      // New weighted = (100 * 0.6) + (98 * 0.4) = 60 + 39.2 = 99.2
      // 99.2 is within [95.2, 101] so trend is stable
      expect(result.Biology.trend).toBe('stable')
    })

    it('should mark trend as "stable" when score remains same', () => {
      const answers = [
        { topic: 'Chemistry', correct: true },
        { topic: 'Chemistry', correct: false },
      ] // 50
      const existingScore = 50
      const result = calculateMastery(answers, existingScore)
      // New weighted = (50 * 0.6) + (50 * 0.4) = 30 + 20 = 50
      // No change, so trend is stable
      expect(result.Chemistry.trend).toBe('stable')
    })

    it('should mark trend as "stable" when no existing score provided', () => {
      const answers = [{ topic: 'Physics', correct: true }]
      const result = calculateMastery(answers)
      expect(result.Physics.trend).toBe('stable')
    })
  })

  describe('multiple topics', () => {
    it('should calculate mastery for multiple topics independently', () => {
      const answers = [
        { topic: 'Biology', correct: true },
        { topic: 'Biology', correct: false },
        { topic: 'Chemistry', correct: true },
        { topic: 'Chemistry', correct: true },
      ]
      const result = calculateMastery(answers)
      expect(result.Biology.score).toBe(50)
      expect(result.Chemistry.score).toBe(100)
    })

    it('should return separate trend for each topic', () => {
      const answers = [
        { topic: 'Biology', correct: true },
        { topic: 'Chemistry', correct: false },
      ]
      const result = calculateMastery(answers)
      expect(result.Biology).toHaveProperty('score')
      expect(result.Biology).toHaveProperty('trend')
      expect(result.Chemistry).toHaveProperty('score')
      expect(result.Chemistry).toHaveProperty('trend')
    })

    it('should handle many topics', () => {
      const answers = [
        { topic: 'Topic1', correct: true },
        { topic: 'Topic2', correct: false },
        { topic: 'Topic3', correct: true },
        { topic: 'Topic4', correct: true },
        { topic: 'Topic5', correct: false },
      ]
      const result = calculateMastery(answers)
      expect(Object.keys(result).length).toBe(5)
    })
  })

  describe('edge cases', () => {
    it('should return object with topic keys', () => {
      const answers = [{ topic: 'Biology', correct: true }]
      const result = calculateMastery(answers)
      expect(result).toHaveProperty('Biology')
    })

    it('should round scores to 2 decimal places', () => {
      const answers = [
        { topic: 'Biology', correct: true },
        { topic: 'Biology', correct: false },
        { topic: 'Biology', correct: false },
      ] // 33.333...
      const result = calculateMastery(answers)
      expect(result.Biology.score).toBe(33.33)
    })

    it('should handle existingScore as 0', () => {
      const answers = [{ topic: 'Biology', correct: true }] // 100
      const result = calculateMastery(answers, 0)
      // (100 * 0.6) + (0 * 0.4) = 60
      expect(result.Biology.score).toBe(60)
    })

    it('should handle existingScore as 100', () => {
      const answers = [{ topic: 'Biology', correct: false }] // 0
      const result = calculateMastery(answers, 100)
      // (0 * 0.6) + (100 * 0.4) = 40
      expect(result.Biology.score).toBe(40)
    })

    it('should treat null and undefined existingScore the same', () => {
      const answers = [{ topic: 'Biology', correct: true }]
      const resultNull = calculateMastery(answers, null)
      const resultUndefined = calculateMastery(answers, undefined)
      expect(resultNull.Biology.score).toBe(resultUndefined.Biology.score)
      expect(resultNull.Biology.trend).toBe(resultUndefined.Biology.trend)
    })

    it('should return consistent results for same input', () => {
      const answers = [
        { topic: 'Biology', correct: true },
        { topic: 'Biology', correct: false },
      ]
      const result1 = calculateMastery(answers, 75)
      const result2 = calculateMastery(answers, 75)
      expect(result1.Biology.score).toBe(result2.Biology.score)
      expect(result1.Biology.trend).toBe(result2.Biology.trend)
    })
  })

  describe('realistic scenarios', () => {
    it('should handle a full quiz with mixed results', () => {
      const answers = [
        { topic: 'Anatomy', correct: true },
        { topic: 'Anatomy', correct: true },
        { topic: 'Anatomy', correct: false },
        { topic: 'Physiology', correct: true },
        { topic: 'Physiology', correct: false },
      ]
      const result = calculateMastery(answers, 70)
      expect(result.Anatomy).toBeDefined()
      expect(result.Physiology).toBeDefined()
      expect(result.Anatomy.score).toBeGreaterThan(0)
      expect(result.Anatomy.score).toBeLessThanOrEqual(100)
    })

    it('should show improvement trend', () => {
      const answers = [
        { topic: 'Biology', correct: true },
        { topic: 'Biology', correct: true },
        { topic: 'Biology', correct: true },
        { topic: 'Biology', correct: true },
      ] // 100
      const result = calculateMastery(answers, 70)
      expect(result.Biology.trend).toBe('up')
    })

    it('should show decline trend', () => {
      const answers = [
        { topic: 'Chemistry', correct: false },
        { topic: 'Chemistry', correct: false },
      ] // 0
      const result = calculateMastery(answers, 80)
      expect(result.Chemistry.trend).toBe('down')
    })
  })
})
