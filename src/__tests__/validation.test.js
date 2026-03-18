import { describe, it, expect, beforeEach } from 'vitest'
import {
  validateFile,
  validatePhotoFile,
  validateScanFile,
  validateQuizAnswers,
  sanitizeTopicInput,
} from '../lib/validation'

describe('validateFile', () => {
  it('should pass validation for a valid file', () => {
    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })
    expect(() => validateFile(file, 10, ['application/pdf'])).not.toThrow()
  })

  it('should throw an error if no file is provided', () => {
    expect(() => validateFile(null)).toThrow('No file provided')
    expect(() => validateFile(undefined)).toThrow('No file provided')
  })

  it('should throw an error if file exceeds size limit', () => {
    const file = new File(['x'.repeat(11 * 1024 * 1024)], 'large.pdf', {
      type: 'application/pdf',
    })
    expect(() => validateFile(file, 10, ['application/pdf'])).toThrow(
      'File too large. Maximum size: 10MB'
    )
  })

  it('should throw an error for invalid file type', () => {
    const file = new File(['test'], 'test.exe', { type: 'application/x-msdownload' })
    expect(() => validateFile(file, 10, ['image/jpeg', 'image/png'])).toThrow(
      'Invalid file type'
    )
  })

  it('should reject .exe extension', () => {
    const file = new File(['test'], 'malware.exe', { type: 'application/octet-stream' })
    expect(() => validateFile(file, 10, [])).toThrow('not allowed')
  })

  it('should reject .bat extension', () => {
    const file = new File(['test'], 'script.bat', { type: 'application/octet-stream' })
    expect(() => validateFile(file, 10, [])).toThrow('not allowed')
  })

  it('should reject .sh extension', () => {
    const file = new File(['test'], 'script.sh', { type: 'text/plain' })
    expect(() => validateFile(file, 10, [])).toThrow('not allowed')
  })

  it('should reject .js extension', () => {
    const file = new File(['test'], 'malicious.js', { type: 'text/javascript' })
    expect(() => validateFile(file, 10, [])).toThrow('not allowed')
  })

  it('should reject .html extension', () => {
    const file = new File(['test'], 'page.html', { type: 'text/html' })
    expect(() => validateFile(file, 10, [])).toThrow('not allowed')
  })

  it('should reject .svg extension', () => {
    const file = new File(['test'], 'image.svg', { type: 'image/svg+xml' })
    expect(() => validateFile(file, 10, [])).toThrow('not allowed')
  })

  it('should accept safe file extensions', () => {
    const file = new File(['test'], 'document.pdf', { type: 'application/pdf' })
    expect(() => validateFile(file, 10, ['application/pdf'])).not.toThrow()
  })

  it('should be case-insensitive for file extensions', () => {
    const file = new File(['test'], 'malware.EXE', { type: 'application/octet-stream' })
    expect(() => validateFile(file, 10, [])).toThrow('not allowed')
  })
})

describe('validatePhotoFile', () => {
  it('should accept valid photo file (JPEG)', () => {
    const file = new File(['image data'], 'photo.jpg', { type: 'image/jpeg' })
    expect(() => validatePhotoFile(file)).not.toThrow()
  })

  it('should accept valid photo file (PNG)', () => {
    const file = new File(['image data'], 'photo.png', { type: 'image/png' })
    expect(() => validatePhotoFile(file)).not.toThrow()
  })

  it('should accept valid photo file (WebP)', () => {
    const file = new File(['image data'], 'photo.webp', { type: 'image/webp' })
    expect(() => validatePhotoFile(file)).not.toThrow()
  })

  it('should reject invalid photo type (PDF)', () => {
    const file = new File(['test'], 'notphoto.pdf', { type: 'application/pdf' })
    expect(() => validatePhotoFile(file)).toThrow('Invalid file type')
  })

  it('should reject oversized photo', () => {
    const file = new File(['x'.repeat(11 * 1024 * 1024)], 'large.jpg', {
      type: 'image/jpeg',
    })
    expect(() => validatePhotoFile(file)).toThrow('File too large')
  })
})

describe('validateScanFile', () => {
  it('should accept valid scan file (JPEG)', () => {
    const file = new File(['image data'], 'scan.jpg', { type: 'image/jpeg' })
    expect(() => validateScanFile(file)).not.toThrow()
  })

  it('should accept valid scan file (PNG)', () => {
    const file = new File(['image data'], 'scan.png', { type: 'image/png' })
    expect(() => validateScanFile(file)).not.toThrow()
  })

  it('should accept valid scan file (PDF)', () => {
    const file = new File(['pdf data'], 'scan.pdf', { type: 'application/pdf' })
    expect(() => validateScanFile(file)).not.toThrow()
  })

  it('should accept valid scan file (WebP)', () => {
    const file = new File(['image data'], 'scan.webp', { type: 'image/webp' })
    expect(() => validateScanFile(file)).not.toThrow()
  })

  it('should reject oversized scan', () => {
    const file = new File(['x'.repeat(21 * 1024 * 1024)], 'large.pdf', {
      type: 'application/pdf',
    })
    expect(() => validateScanFile(file)).toThrow('File too large')
  })
})

describe('validateQuizAnswers', () => {
  it('should accept valid answers array', () => {
    const answers = [
      { topic: 'Biology', correct: true },
      { topic: 'Chemistry', correct: false },
    ]
    expect(() => validateQuizAnswers(answers)).not.toThrow()
  })

  it('should reject non-array input', () => {
    expect(() => validateQuizAnswers('not an array')).toThrow(
      'Answers must be an array'
    )
  })

  it('should reject empty array', () => {
    expect(() => validateQuizAnswers([])).toThrow(
      'At least one answer is required'
    )
  })

  it('should reject answer missing topic field', () => {
    const answers = [{ correct: true }]
    expect(() => validateQuizAnswers(answers)).toThrow(
      'Each answer must have a valid topic string'
    )
  })

  it('should reject answer with non-string topic', () => {
    const answers = [{ topic: 123, correct: true }]
    expect(() => validateQuizAnswers(answers)).toThrow(
      'Each answer must have a valid topic string'
    )
  })

  it('should reject answer missing correct field', () => {
    const answers = [{ topic: 'Biology' }]
    expect(() => validateQuizAnswers(answers)).toThrow(
      'Each answer must have a correct boolean value'
    )
  })

  it('should reject answer with non-boolean correct field', () => {
    const answers = [{ topic: 'Biology', correct: 'yes' }]
    expect(() => validateQuizAnswers(answers)).toThrow(
      'Each answer must have a correct boolean value'
    )
  })

  it('should accept multiple valid answers', () => {
    const answers = [
      { topic: 'Biology', correct: true },
      { topic: 'Chemistry', correct: false },
      { topic: 'Physics', correct: true },
      { topic: 'Geology', correct: false },
    ]
    expect(() => validateQuizAnswers(answers)).not.toThrow()
  })
})

describe('sanitizeTopicInput', () => {
  it('should pass through normal text unchanged', () => {
    const result = sanitizeTopicInput('Biology')
    expect(result).toBe('Biology')
  })

  it('should strip HTML tags', () => {
    const result = sanitizeTopicInput('<script>alert("xss")</script>Biology')
    expect(result).toBe('scriptBiology')
  })

  it('should strip special characters while preserving & and -', () => {
    const result = sanitizeTopicInput('Bio@logy & Che#mistry')
    expect(result).toBe('Biology & Chemistry')
  })

  it('should preserve hyphens', () => {
    const result = sanitizeTopicInput('Plant-Animal Interactions')
    expect(result).toBe('Plant-Animal Interactions')
  })

  it('should preserve ampersands', () => {
    const result = sanitizeTopicInput('Physics & Chemistry')
    expect(result).toBe('Physics & Chemistry')
  })

  it('should truncate to 100 characters', () => {
    const longText = 'a'.repeat(150)
    const result = sanitizeTopicInput(longText)
    expect(result.length).toBeLessThanOrEqual(100)
  })

  it('should collapse multiple spaces', () => {
    const result = sanitizeTopicInput('Biology    and    Chemistry')
    expect(result).toBe('Biology and Chemistry')
  })

  it('should throw error for null input', () => {
    expect(() => sanitizeTopicInput(null)).toThrow(
      'Topic must be a non-empty string'
    )
  })

  it('should throw error for undefined input', () => {
    expect(() => sanitizeTopicInput(undefined)).toThrow(
      'Topic must be a non-empty string'
    )
  })

  it('should throw error for empty string', () => {
    expect(() => sanitizeTopicInput('')).toThrow(
      'Topic must be a non-empty string'
    )
  })

  it('should throw error if sanitization results in empty string', () => {
    expect(() => sanitizeTopicInput('@#$%^&*()')).toThrow(
      'Topic cannot be empty after sanitization'
    )
  })

  it('should handle mixed special characters and valid text', () => {
    const result = sanitizeTopicInput('Ner!!vous Sy@$%tem')
    expect(result).toBe('Nervous System')
  })

  it('should preserve numbers in topic', () => {
    const result = sanitizeTopicInput('Biology 101 & Chemistry')
    expect(result).toBe('Biology 101  Chemistry')
  })

  it('should trim leading and trailing whitespace', () => {
    const result = sanitizeTopicInput('   Biology   ')
    expect(result).toBe('Biology')
  })
})
