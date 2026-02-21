import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import type { Pull, Card } from '../types'
import { SafeStorage } from '../utils/safe-storage'

export function usePulls() {
  const [pulls, setPulls] = useState<Pull[]>(
    () => SafeStorage.getJSON<Pull[]>('lorcana_session_pulls', []),
  )

  const [savedIndicator, setSavedIndicator] = useState(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auto-save to localStorage with debounced indicator
  useEffect(() => {
    SafeStorage.setJSON('lorcana_session_pulls', pulls)

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      setSavedIndicator(true)
      setTimeout(() => setSavedIndicator(false), 1800)
    }, 500)

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [pulls])

  const addPull = useCallback((card: Card, variant: 'normal' | 'foil', packNumber: number) => {
    const key = card.setCode + '-' + card.cn + '-' + variant

    setPulls((prev) => {
      const found = prev.some((p) => p.key === key)
      if (found) {
        return prev.map((p) =>
          p.key === key
            ? { ...p, count: p.count + 1, packNumber: p.packNumber || packNumber }
            : p,
        )
      }
      return [...prev, { key, card, variant, count: 1, packNumber }]
    })

    return key
  }, [])

  const updateCount = useCallback((key: string, delta: number) => {
    setPulls((prev) => {
      const target = prev.find((p) => p.key === key)
      if (!target) return prev
      if (target.count + delta <= 0) {
        return prev.filter((p) => p.key !== key)
      }
      return prev.map((p) =>
        p.key === key ? { ...p, count: p.count + delta } : p,
      )
    })
  }, [])

  const removePull = useCallback((key: string) => {
    setPulls((prev) => prev.filter((p) => p.key !== key))
  }, [])

  const clearPulls = useCallback(() => {
    setPulls([])
  }, [])

  // Derived stats
  const totalCards = useMemo(
    () => pulls.reduce((s, p) => s + p.count, 0),
    [pulls],
  )

  const totalFoils = useMemo(
    () => pulls.filter((p) => p.variant === 'foil').reduce((s, p) => s + p.count, 0),
    [pulls],
  )

  const totalLegendary = useMemo(
    () => pulls.filter((p) => p.card.rarity === 'Legendary').reduce((s, p) => s + p.count, 0),
    [pulls],
  )

  const totalSuperRare = useMemo(
    () =>
      pulls
        .filter((p) => p.card.rarity === 'Super Rare' || p.card.rarity === 'Super_rare')
        .reduce((s, p) => s + p.count, 0),
    [pulls],
  )

  const totalEnchanted = useMemo(
    () => pulls.filter((p) => p.card.rarity === 'Enchanted').reduce((s, p) => s + p.count, 0),
    [pulls],
  )

  const totalPacks = useMemo(
    () => pulls.reduce((max, p) => ((p.packNumber || 0) > max ? p.packNumber || 0 : max), 0),
    [pulls],
  )

  // Group pulls by set name, sorted by collector number
  const groupedPulls = useMemo(() => {
    const groups: Record<string, Pull[]> = {}
    pulls.forEach((p) => {
      const sn = p.card.setName
      if (!groups[sn]) groups[sn] = []
      groups[sn]!.push(p)
    })
    Object.keys(groups).forEach((k) => {
      groups[k]!.sort((a, b) => parseInt(a.card.cn) - parseInt(b.card.cn))
    })
    return groups
  }, [pulls])

  return {
    pulls,
    setPulls,
    savedIndicator,
    addPull,
    updateCount,
    removePull,
    clearPulls,
    totalCards,
    totalFoils,
    totalLegendary,
    totalSuperRare,
    totalEnchanted,
    totalPacks,
    groupedPulls,
  }
}
