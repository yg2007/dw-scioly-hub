import { describe, it, expect } from 'vitest'
import { EVENTS, STUDENTS, PARTNERSHIPS, QUIZ_BANK } from '../data/mockData'

describe('Mock Data Integrity', () => {
  describe('EVENTS data structure', () => {
    it('should have exactly 23 events', () => {
      expect(EVENTS).toHaveLength(23)
    })

    it('should have all required fields for each event', () => {
      EVENTS.forEach((event) => {
        expect(event).toHaveProperty('id')
        expect(event).toHaveProperty('name')
        expect(event).toHaveProperty('type')
        expect(event).toHaveProperty('teamSize')
        expect(event).toHaveProperty('icon')
        expect(event).toHaveProperty('topics')
      })
    })

    it('should have valid event types (study, lab, or build)', () => {
      const validTypes = ['study', 'lab', 'build']
      EVENTS.forEach((event) => {
        expect(validTypes).toContain(event.type)
      })
    })

    it('should have unique event IDs', () => {
      const ids = EVENTS.map((e) => e.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(EVENTS.length)
    })

    it('should have unique event names', () => {
      const names = EVENTS.map((e) => e.name)
      const uniqueNames = new Set(names)
      expect(uniqueNames.size).toBe(EVENTS.length)
    })

    it('should have positive team size', () => {
      EVENTS.forEach((event) => {
        expect(event.teamSize).toBeGreaterThan(0)
      })
    })

    it('should have non-empty topics array', () => {
      EVENTS.forEach((event) => {
        expect(Array.isArray(event.topics)).toBe(true)
        expect(event.topics.length).toBeGreaterThan(0)
      })
    })

    it('should have emoji icons', () => {
      EVENTS.forEach((event) => {
        expect(event.icon).toMatch(/\p{Emoji}/u)
      })
    })

    it('should have string topic names', () => {
      EVENTS.forEach((event) => {
        event.topics.forEach((topic) => {
          expect(typeof topic).toBe('string')
          expect(topic.length).toBeGreaterThan(0)
        })
      })
    })
  })

  describe('STUDENTS data structure', () => {
    it('should have students', () => {
      expect(STUDENTS.length).toBeGreaterThan(0)
    })

    it('should have all required fields for each student', () => {
      STUDENTS.forEach((student) => {
        expect(student).toHaveProperty('id')
        expect(student).toHaveProperty('name')
        expect(student).toHaveProperty('initials')
        expect(student).toHaveProperty('events')
        expect(student).toHaveProperty('color')
      })
    })

    it('should have unique student IDs', () => {
      const ids = STUDENTS.map((s) => s.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(STUDENTS.length)
    })

    it('should have non-empty names', () => {
      STUDENTS.forEach((student) => {
        expect(student.name).toBeTruthy()
        expect(typeof student.name).toBe('string')
      })
    })

    it('should have valid initials (2 characters)', () => {
      STUDENTS.forEach((student) => {
        expect(student.initials).toMatch(/^[A-Z]{2}$/)
      })
    })

    it('should have valid color codes (hex format)', () => {
      STUDENTS.forEach((student) => {
        expect(student.color).toMatch(/^#[0-9A-F]{6}$/i)
      })
    })

    it('should have events array', () => {
      STUDENTS.forEach((student) => {
        expect(Array.isArray(student.events)).toBe(true)
      })
    })

    it('should reference valid event IDs', () => {
      const validEventIds = new Set(EVENTS.map((e) => e.id))
      STUDENTS.forEach((student) => {
        student.events.forEach((eventId) => {
          expect(validEventIds.has(eventId)).toBe(true)
        })
      })
    })
  })

  describe('PARTNERSHIPS data structure', () => {
    it('should have partnerships array', () => {
      expect(Array.isArray(PARTNERSHIPS)).toBe(true)
    })

    it('should have required fields for each partnership', () => {
      PARTNERSHIPS.forEach((partnership) => {
        expect(partnership).toHaveProperty('eventId')
        expect(partnership).toHaveProperty('partners')
      })
    })

    it('should reference valid event IDs', () => {
      const validEventIds = new Set(EVENTS.map((e) => e.id))
      PARTNERSHIPS.forEach((partnership) => {
        expect(validEventIds.has(partnership.eventId)).toBe(true)
      })
    })

    it('should reference valid student IDs', () => {
      const validStudentIds = new Set(STUDENTS.map((s) => s.id))
      PARTNERSHIPS.forEach((partnership) => {
        partnership.partners.forEach((partnerId) => {
          expect(validStudentIds.has(partnerId)).toBe(true)
        })
      })
    })

    it('should have partner arrays with valid structure', () => {
      PARTNERSHIPS.forEach((partnership) => {
        expect(Array.isArray(partnership.partners)).toBe(true)
        expect(partnership.partners.length).toBeGreaterThan(0)
      })
    })
  })

  describe('QUIZ_BANK data structure', () => {
    it('should have quiz questions', () => {
      expect(Object.keys(QUIZ_BANK).length).toBeGreaterThan(0)
    })

    it('should have quiz questions for valid event IDs', () => {
      const validEventIds = new Set(EVENTS.map((e) => e.id))
      Object.keys(QUIZ_BANK).forEach((eventId) => {
        expect(validEventIds.has(parseInt(eventId))).toBe(true)
      })
    })

    it('should have questions array for each event', () => {
      Object.values(QUIZ_BANK).forEach((questions) => {
        expect(Array.isArray(questions)).toBe(true)
        expect(questions.length).toBeGreaterThan(0)
      })
    })

    it('should have all required fields for each question', () => {
      Object.values(QUIZ_BANK).forEach((questions) => {
        questions.forEach((question) => {
          expect(question).toHaveProperty('q')
          expect(question).toHaveProperty('options')
          expect(question).toHaveProperty('correct')
          expect(question).toHaveProperty('topic')
          expect(question).toHaveProperty('difficulty')
          expect(question).toHaveProperty('explanation')
        })
      })
    })

    it('should have exactly 4 options per question', () => {
      Object.values(QUIZ_BANK).forEach((questions) => {
        questions.forEach((question) => {
          expect(question.options).toHaveLength(4)
        })
      })
    })

    it('should have options as strings', () => {
      Object.values(QUIZ_BANK).forEach((questions) => {
        questions.forEach((question) => {
          question.options.forEach((option) => {
            expect(typeof option).toBe('string')
          })
        })
      })
    })

    it('should have correct index between 0-3', () => {
      Object.values(QUIZ_BANK).forEach((questions) => {
        questions.forEach((question) => {
          expect(question.correct).toBeGreaterThanOrEqual(0)
          expect(question.correct).toBeLessThan(4)
        })
      })
    })

    it('should have valid difficulty levels (1-3)', () => {
      Object.values(QUIZ_BANK).forEach((questions) => {
        questions.forEach((question) => {
          expect(question.difficulty).toBeGreaterThanOrEqual(1)
          expect(question.difficulty).toBeLessThanOrEqual(3)
        })
      })
    })

    it('should have non-empty question text', () => {
      Object.values(QUIZ_BANK).forEach((questions) => {
        questions.forEach((question) => {
          expect(question.q).toBeTruthy()
          expect(typeof question.q).toBe('string')
        })
      })
    })

    it('should have non-empty topic', () => {
      Object.values(QUIZ_BANK).forEach((questions) => {
        questions.forEach((question) => {
          expect(question.topic).toBeTruthy()
          expect(typeof question.topic).toBe('string')
        })
      })
    })

    it('should have non-empty explanation', () => {
      Object.values(QUIZ_BANK).forEach((questions) => {
        questions.forEach((question) => {
          expect(question.explanation).toBeTruthy()
          expect(typeof question.explanation).toBe('string')
        })
      })
    })

    it('should have topics that match event topics', () => {
      Object.entries(QUIZ_BANK).forEach(([eventIdStr, questions]) => {
        const eventId = parseInt(eventIdStr)
        const event = EVENTS.find((e) => e.id === eventId)
        expect(event).toBeDefined()

        questions.forEach((question) => {
          expect(event.topics).toContain(question.topic)
        })
      })
    })
  })

  describe('Cross-data consistency', () => {
    it('all student event references should point to valid events', () => {
      const eventIds = new Set(EVENTS.map((e) => e.id))
      STUDENTS.forEach((student) => {
        student.events.forEach((eventId) => {
          expect(eventIds.has(eventId)).toBe(true)
        })
      })
    })

    it('all partnership events should exist', () => {
      const eventIds = new Set(EVENTS.map((e) => e.id))
      PARTNERSHIPS.forEach((partnership) => {
        expect(eventIds.has(partnership.eventId)).toBe(true)
      })
    })

    it('all partnership students should exist', () => {
      const studentIds = new Set(STUDENTS.map((s) => s.id))
      PARTNERSHIPS.forEach((partnership) => {
        partnership.partners.forEach((partnerId) => {
          expect(studentIds.has(partnerId)).toBe(true)
        })
      })
    })

    it('quiz questions should only reference valid topics', () => {
      const eventTopics = {}
      EVENTS.forEach((event) => {
        eventTopics[event.id] = new Set(event.topics)
      })

      Object.entries(QUIZ_BANK).forEach(([eventIdStr, questions]) => {
        const eventId = parseInt(eventIdStr)
        const validTopics = eventTopics[eventId]
        expect(validTopics).toBeDefined()

        questions.forEach((question) => {
          expect(validTopics.has(question.topic)).toBe(true)
        })
      })
    })
  })
})
