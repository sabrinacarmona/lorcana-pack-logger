import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { formatRelativeTime, sanitiseFilename } from '../../utils/formatting'

describe('formatRelativeTime', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('returns "just now" for < 60 seconds', () => {
    const now = 1700000000000
    vi.setSystemTime(now)
    expect(formatRelativeTime(now - 30000)).toBe('just now')
  })

  it('returns minutes for < 60 mins', () => {
    const now = 1700000000000
    vi.setSystemTime(now)
    expect(formatRelativeTime(now - 10 * 60 * 1000)).toBe('10 mins ago')
  })

  it('returns singular minute', () => {
    const now = 1700000000000
    vi.setSystemTime(now)
    expect(formatRelativeTime(now - 60 * 1000)).toBe('1 min ago')
  })

  it('returns hours for < 24 hours', () => {
    const now = 1700000000000
    vi.setSystemTime(now)
    expect(formatRelativeTime(now - 3 * 60 * 60 * 1000)).toBe('3 hours ago')
  })

  it('returns singular hour', () => {
    const now = 1700000000000
    vi.setSystemTime(now)
    expect(formatRelativeTime(now - 60 * 60 * 1000)).toBe('1 hour ago')
  })

  it('returns days for >= 24 hours', () => {
    const now = 1700000000000
    vi.setSystemTime(now)
    expect(formatRelativeTime(now - 2 * 24 * 60 * 60 * 1000)).toBe('2 days ago')
  })

  it('returns empty string for falsy input', () => {
    expect(formatRelativeTime(0)).toBe('')
  })
})

describe('sanitiseFilename', () => {
  it('replaces illegal characters with underscores', () => {
    expect(sanitiseFilename('My:Session/1')).toBe('My_Session_1')
  })

  it('preserves normal characters', () => {
    expect(sanitiseFilename('Set 5 Opening')).toBe('Set 5 Opening')
  })

  it('returns fallback for empty result', () => {
    expect(sanitiseFilename('***')).toBe('___')
  })

  it('returns fallback for blank input', () => {
    expect(sanitiseFilename('')).toBe('dreamborn_import')
  })
})
