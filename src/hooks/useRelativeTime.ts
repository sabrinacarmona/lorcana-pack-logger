import { useState, useEffect } from 'react'
import { formatRelativeTime } from '../utils/formatting'

export function useRelativeTime(timestamp: number | null) {
  const [relativeTime, setRelativeTime] = useState('')

  useEffect(() => {
    if (!timestamp) {
      setRelativeTime('')
      return
    }

    setRelativeTime(formatRelativeTime(timestamp))
    const interval = setInterval(() => {
      setRelativeTime(formatRelativeTime(timestamp))
    }, 60000)

    return () => clearInterval(interval)
  }, [timestamp])

  return relativeTime
}
