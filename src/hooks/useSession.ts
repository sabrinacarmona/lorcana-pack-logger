import { useState, useCallback, useRef } from 'react'
import { SafeStorage } from '../utils/safe-storage'

/**
 * Generate a default session name from the current date and time.
 * Format: "21 Feb 2026, 16:30"
 */
function defaultSessionName(): string {
  const d = new Date()
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function useSession() {
  const [sessionName, setSessionNameRaw] = useState<string>(
    () => SafeStorage.getItem('lorcana_session_name') || defaultSessionName(),
  )

  const [sessionStartedAt, setSessionStartedAtRaw] = useState<number | null>(() => {
    const t = SafeStorage.getItem('lorcana_session_started')
    return t ? parseInt(t, 10) : null
  })

  const addCountRef = useRef<number>(
    (() => {
      const c = SafeStorage.getItem('lorcana_session_add_count')
      return c ? parseInt(c, 10) : 0
    })(),
  )

  const setSessionName = useCallback((name: string) => {
    setSessionNameRaw(name)
    SafeStorage.setItem('lorcana_session_name', name)
  }, [])

  const ensureSessionStarted = useCallback(() => {
    setSessionStartedAtRaw((prev) => {
      if (prev) return prev
      const now = Date.now()
      SafeStorage.setItem('lorcana_session_started', String(now))
      return now
    })
  }, [])

  const incrementAddCount = useCallback(() => {
    addCountRef.current = addCountRef.current + 1
    SafeStorage.setItem('lorcana_session_add_count', String(addCountRef.current))
    return addCountRef.current
  }, [])

  const currentPack = useCallback(() => {
    return Math.ceil(addCountRef.current / 12)
  }, [])

  const clearSession = useCallback(() => {
    setSessionNameRaw(defaultSessionName())
    setSessionStartedAtRaw(null)
    addCountRef.current = 0
    SafeStorage.removeItem('lorcana_session_name')
    SafeStorage.removeItem('lorcana_session_started')
    SafeStorage.removeItem('lorcana_session_add_count')
    SafeStorage.removeItem('lorcana_session_pulls')
  }, [])

  return {
    sessionName,
    sessionStartedAt,
    addCountRef,
    setSessionName,
    ensureSessionStarted,
    incrementAddCount,
    currentPack,
    clearSession,
  }
}
