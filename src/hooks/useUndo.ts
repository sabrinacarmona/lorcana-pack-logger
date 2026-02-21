import { useState, useCallback, useRef, useEffect } from 'react'
import type { Card } from '../types'

export interface UndoAction {
  key: string
  card: Card
  variant: 'normal' | 'foil'
  timestamp: number
}

export function useUndo() {
  const [showUndo, setShowUndo] = useState(false)
  const [undoFading, setUndoFading] = useState(false)

  const lastActionRef = useRef<UndoAction | null>(null)
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const undoFadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
      if (undoFadeTimerRef.current) clearTimeout(undoFadeTimerRef.current)
    }
  }, [])

  const recordAction = useCallback((card: Card, variant: 'normal' | 'foil') => {
    const key = card.setCode + '-' + card.cn + '-' + variant
    lastActionRef.current = { key, card, variant, timestamp: Date.now() }

    // Clear any existing timers
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
    if (undoFadeTimerRef.current) clearTimeout(undoFadeTimerRef.current)

    setUndoFading(false)
    setShowUndo(true)

    // Start fade-out after 2.6s, then hide after 3s total
    undoFadeTimerRef.current = setTimeout(() => {
      setUndoFading(true)
    }, 2600)

    undoTimerRef.current = setTimeout(() => {
      setShowUndo(false)
      setUndoFading(false)
      lastActionRef.current = null
    }, 3000)
  }, [])

  const clearUndo = useCallback(() => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
    if (undoFadeTimerRef.current) clearTimeout(undoFadeTimerRef.current)
    lastActionRef.current = null
    setShowUndo(false)
    setUndoFading(false)
  }, [])

  return {
    showUndo,
    undoFading,
    lastActionRef,
    recordAction,
    clearUndo,
  }
}
