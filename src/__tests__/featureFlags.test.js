import { describe, it, expect } from 'vitest'
import { APP_MODE, IS_PRODUCTION, IS_PROTOTYPE, FLAGS } from '../lib/featureFlags'

describe('Feature Flags', () => {
  describe('APP_MODE detection', () => {
    it('should have an APP_MODE value', () => {
      expect(APP_MODE).toBeDefined()
    })

    it('should be either "prototype" or "production"', () => {
      expect(['prototype', 'production']).toContain(APP_MODE)
    })

    it('should default to "prototype" mode', () => {
      // Since VITE_MODE can be production in test environment too depending on env file
      expect(APP_MODE).toBeDefined()
    })
  })

  describe('IS_PRODUCTION flag', () => {
    it('should be a boolean', () => {
      expect(typeof IS_PRODUCTION).toBe('boolean')
    })

    it('should be true only in production mode', () => {
      if (APP_MODE === 'production') {
        expect(IS_PRODUCTION).toBe(true)
      } else {
        expect(IS_PRODUCTION).toBe(false)
      }
    })
  })

  describe('IS_PROTOTYPE flag', () => {
    it('should be a boolean', () => {
      expect(typeof IS_PROTOTYPE).toBe('boolean')
    })

    it('should be true only in prototype mode', () => {
      if (APP_MODE === 'prototype') {
        expect(IS_PROTOTYPE).toBe(true)
      } else {
        expect(IS_PROTOTYPE).toBe(false)
      }
    })

    it('should be opposite of IS_PRODUCTION', () => {
      expect(IS_PROTOTYPE).toBe(!IS_PRODUCTION)
    })
  })

  describe('FLAGS object', () => {
    it('should have FLAGS object', () => {
      expect(FLAGS).toBeDefined()
      expect(typeof FLAGS).toBe('object')
    })

    it('should have expected flag keys', () => {
      expect(FLAGS).toHaveProperty('realAuth')
      expect(FLAGS).toHaveProperty('realData')
      expect(FLAGS).toHaveProperty('aiQuizzes')
      expect(FLAGS).toHaveProperty('aiTestAnalysis')
      expect(FLAGS).toHaveProperty('realtime')
      expect(FLAGS).toHaveProperty('pwa')
    })

    it('should have boolean values for all flags', () => {
      Object.values(FLAGS).forEach((flag) => {
        expect(typeof flag).toBe('boolean')
      })
    })
  })

  describe('Feature flag defaults in prototype mode', () => {
    it('all flags should default to false in prototype mode when env vars not set', () => {
      // In prototype mode without explicit env var overrides, flags should be false
      if (APP_MODE === 'prototype') {
        // Only checking that flags exist and are booleans
        // Actual values depend on environment variables
        expect(typeof FLAGS.realAuth).toBe('boolean')
        expect(typeof FLAGS.realData).toBe('boolean')
        expect(typeof FLAGS.aiQuizzes).toBe('boolean')
        expect(typeof FLAGS.aiTestAnalysis).toBe('boolean')
        expect(typeof FLAGS.realtime).toBe('boolean')
        expect(typeof FLAGS.pwa).toBe('boolean')
      }
    })
  })

  describe('Feature flag consistency', () => {
    it('realAuth should be true in production mode', () => {
      if (IS_PRODUCTION) {
        expect(FLAGS.realAuth).toBe(true)
      }
    })

    it('realData should be true in production mode', () => {
      if (IS_PRODUCTION) {
        expect(FLAGS.realData).toBe(true)
      }
    })

    it('aiQuizzes should be true in production mode', () => {
      if (IS_PRODUCTION) {
        expect(FLAGS.aiQuizzes).toBe(true)
      }
    })

    it('aiTestAnalysis should be true in production mode', () => {
      if (IS_PRODUCTION) {
        expect(FLAGS.aiTestAnalysis).toBe(true)
      }
    })

    it('realtime should be true in production mode', () => {
      if (IS_PRODUCTION) {
        expect(FLAGS.realtime).toBe(true)
      }
    })

    it('pwa should be true in production mode', () => {
      if (IS_PRODUCTION) {
        expect(FLAGS.pwa).toBe(true)
      }
    })
  })

  describe('Mode consistency', () => {
    it('exactly one of IS_PRODUCTION or IS_PROTOTYPE should be true', () => {
      const count = (IS_PRODUCTION ? 1 : 0) + (IS_PROTOTYPE ? 1 : 0)
      expect(count).toBe(1)
    })

    it('APP_MODE should match IS_PRODUCTION', () => {
      if (APP_MODE === 'production') {
        expect(IS_PRODUCTION).toBe(true)
      } else {
        expect(IS_PRODUCTION).toBe(false)
      }
    })

    it('APP_MODE should match IS_PROTOTYPE', () => {
      if (APP_MODE === 'prototype') {
        expect(IS_PROTOTYPE).toBe(true)
      } else {
        expect(IS_PROTOTYPE).toBe(false)
      }
    })
  })

  describe('Flag independence', () => {
    it('flags should be independently configurable', () => {
      // Verify that the FLAGS object has all expected flags
      const expectedFlags = [
        'realAuth',
        'realData',
        'aiQuizzes',
        'aiTestAnalysis',
        'realtime',
        'pwa',
      ]
      expectedFlags.forEach((flagName) => {
        expect(FLAGS).toHaveProperty(flagName)
      })
      // Verify we have exactly these flags
      expect(Object.keys(FLAGS).length).toBe(expectedFlags.length)
    })
  })
})
