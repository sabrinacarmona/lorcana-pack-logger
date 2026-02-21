import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSession } from '../../hooks/useSession'

describe('useSession', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('initializes with an auto-generated date/time session name', () => {
    const { result } = renderHook(() => useSession())
    // Default name matches pattern like "21 Feb 2026, 16:30"
    expect(result.current.sessionName).toMatch(/^\d{1,2} \w{3} \d{4}, \d{2}:\d{2}$/)
  })

  it('initializes with null sessionStartedAt when not set', () => {
    const { result } = renderHook(() => useSession())
    expect(result.current.sessionStartedAt).toBeNull()
  })

  it('initializes addCountRef with 0', () => {
    const { result } = renderHook(() => useSession())
    expect(result.current.addCountRef.current).toBe(0)
  })

  it('sets session name and persists to localStorage', () => {
    const { result } = renderHook(() => useSession())

    act(() => {
      result.current.setSessionName('My Session')
    })

    expect(result.current.sessionName).toBe('My Session')
    expect(localStorage.getItem('lorcana_session_name')).toBe('My Session')
  })

  it('ensureSessionStarted sets timestamp on first call', () => {
    const { result } = renderHook(() => useSession())

    const beforeCall = Date.now()

    act(() => {
      result.current.ensureSessionStarted()
    })

    const afterCall = Date.now()

    expect(result.current.sessionStartedAt).toBeTruthy()
    expect(result.current.sessionStartedAt!).toBeGreaterThanOrEqual(beforeCall)
    expect(result.current.sessionStartedAt!).toBeLessThanOrEqual(afterCall)
  })

  it('ensureSessionStarted does not reset timestamp on second call', () => {
    const { result } = renderHook(() => useSession())

    act(() => {
      result.current.ensureSessionStarted()
    })

    const firstTimestamp = result.current.sessionStartedAt

    act(() => {
      result.current.ensureSessionStarted()
    })

    expect(result.current.sessionStartedAt).toBe(firstTimestamp)
  })

  it('ensureSessionStarted persists timestamp to localStorage', () => {
    const { result } = renderHook(() => useSession())

    act(() => {
      result.current.ensureSessionStarted()
    })

    const stored = localStorage.getItem('lorcana_session_started')
    expect(stored).toBeTruthy()
    expect(parseInt(stored!, 10)).toBe(result.current.sessionStartedAt)
  })

  it('incrementAddCount increments count and returns new value', () => {
    const { result } = renderHook(() => useSession())

    let newCount: number

    act(() => {
      newCount = result.current.incrementAddCount()
    })
    expect(newCount!).toBe(1)
    expect(result.current.addCountRef.current).toBe(1)

    act(() => {
      newCount = result.current.incrementAddCount()
    })
    expect(newCount!).toBe(2)
    expect(result.current.addCountRef.current).toBe(2)
  })

  it('incrementAddCount persists count to localStorage', () => {
    const { result } = renderHook(() => useSession())

    act(() => {
      result.current.incrementAddCount()
    })

    expect(localStorage.getItem('lorcana_session_add_count')).toBe('1')

    act(() => {
      result.current.incrementAddCount()
    })

    expect(localStorage.getItem('lorcana_session_add_count')).toBe('2')
  })

  it('currentPack calculates pack number as ceil(addCount / 12)', () => {
    const { result } = renderHook(() => useSession())

    // Start with 0, should be pack 0
    expect(result.current.currentPack()).toBe(0)

    // Add 1 card, should be pack 1
    act(() => {
      result.current.incrementAddCount()
    })
    expect(result.current.currentPack()).toBe(1)

    // Add 11 more cards (total 12), should still be pack 1
    for (let i = 0; i < 11; i++) {
      act(() => {
        result.current.incrementAddCount()
      })
    }
    expect(result.current.currentPack()).toBe(1)

    // Add 1 more card (total 13), should be pack 2
    act(() => {
      result.current.incrementAddCount()
    })
    expect(result.current.currentPack()).toBe(2)

    // Add 11 more cards (total 24), should still be pack 2
    for (let i = 0; i < 11; i++) {
      act(() => {
        result.current.incrementAddCount()
      })
    }
    expect(result.current.currentPack()).toBe(2)

    // Add 1 more card (total 25), should be pack 3
    act(() => {
      result.current.incrementAddCount()
    })
    expect(result.current.currentPack()).toBe(3)
  })

  it('clearSession resets all state and localStorage', () => {
    const { result } = renderHook(() => useSession())

    act(() => {
      result.current.setSessionName('Test Session')
      result.current.ensureSessionStarted()
      result.current.incrementAddCount()
      result.current.incrementAddCount()
    })

    expect(result.current.sessionName).toBe('Test Session')
    expect(result.current.sessionStartedAt).toBeTruthy()
    expect(result.current.addCountRef.current).toBe(2)

    act(() => {
      result.current.clearSession()
    })

    expect(result.current.sessionName).toMatch(/^\d{1,2} \w{3} \d{4}, \d{2}:\d{2}$/)
    expect(result.current.sessionStartedAt).toBeNull()
    expect(result.current.addCountRef.current).toBe(0)
    expect(localStorage.getItem('lorcana_session_name')).toBeNull()
    expect(localStorage.getItem('lorcana_session_started')).toBeNull()
    expect(localStorage.getItem('lorcana_session_add_count')).toBeNull()
    expect(localStorage.getItem('lorcana_session_pulls')).toBeNull()
  })

  it('loads persisted session name from localStorage', () => {
    localStorage.setItem('lorcana_session_name', 'Persisted Session')

    const { result } = renderHook(() => useSession())
    expect(result.current.sessionName).toBe('Persisted Session')
  })

  it('loads persisted add count from localStorage', () => {
    localStorage.setItem('lorcana_session_add_count', '5')

    const { result } = renderHook(() => useSession())
    expect(result.current.addCountRef.current).toBe(5)
  })

  it('loads persisted session started timestamp from localStorage', () => {
    const timestamp = '1234567890'
    localStorage.setItem('lorcana_session_started', timestamp)

    const { result } = renderHook(() => useSession())
    expect(result.current.sessionStartedAt).toBe(1234567890)
  })
})
