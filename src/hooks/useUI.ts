import { useState, useCallback } from 'react'
import type { ViewType, ViewDirection } from '../types'

export function useUI() {
  const [view, setViewRaw] = useState<ViewType>('search')
  const [viewDirection, setViewDirection] = useState<ViewDirection>('right')
  const [firstInteraction, setFirstInteraction] = useState(true)
  const [removingKey, setRemovingKey] = useState<string | null>(null)
  const [csvExpanded, setCsvExpanded] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [expandedHistory, setExpandedHistory] = useState<number | null>(null)

  const setView = useCallback((newView: ViewType) => {
    setViewRaw((prev) => {
      if (newView === 'search') {
        setViewDirection('left')
      } else {
        setViewDirection('right')
      }
      return newView
    })
  }, [])

  const animateRemove = useCallback((key: string, onComplete: () => void) => {
    setRemovingKey(key)
    setTimeout(() => {
      onComplete()
      setRemovingKey(null)
    }, 200)
  }, [])

  return {
    view,
    viewDirection,
    firstInteraction,
    setFirstInteraction,
    removingKey,
    csvExpanded,
    setCsvExpanded,
    confirmClear,
    setConfirmClear,
    expandedHistory,
    setExpandedHistory,
    setView,
    animateRemove,
  }
}
