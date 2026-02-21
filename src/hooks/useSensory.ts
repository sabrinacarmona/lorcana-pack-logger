import { useState, useCallback, useRef, useEffect } from 'react'
import type { RarityFlashType } from '../types'
import { SafeStorage } from '../utils/safe-storage'

export function useSensory() {
  const [sensoryEnabled, setSensoryEnabledRaw] = useState<boolean>(() => {
    const v = SafeStorage.getItem('lorcana_sensory_enabled')
    return v === null ? true : v === 'true'
  })

  const [rarityFlash, setRarityFlash] = useState<RarityFlashType>(null)
  const [countBumping, setCountBumping] = useState(false)

  const rarityFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const countBumpTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (rarityFlashTimerRef.current) clearTimeout(rarityFlashTimerRef.current)
      if (countBumpTimerRef.current) clearTimeout(countBumpTimerRef.current)
    }
  }, [])

  const toggleSensory = useCallback(() => {
    setSensoryEnabledRaw((prev) => {
      const next = !prev
      SafeStorage.setItem('lorcana_sensory_enabled', String(next))
      return next
    })
  }, [])

  const triggerFeedback = useCallback(
    (rarity: string) => {
      if (!sensoryEnabled) return

      // Haptic
      if (navigator.vibrate) {
        try {
          navigator.vibrate(10)
        } catch {
          /* unsupported */
        }
      }

      // Count bump
      setCountBumping(true)
      if (countBumpTimerRef.current) clearTimeout(countBumpTimerRef.current)
      countBumpTimerRef.current = setTimeout(() => setCountBumping(false), 250)

      // Rarity flash
      if (rarity === 'Enchanted') {
        setRarityFlash('enchanted')
        if (rarityFlashTimerRef.current) clearTimeout(rarityFlashTimerRef.current)
        rarityFlashTimerRef.current = setTimeout(() => setRarityFlash(null), 450)
      } else if (rarity === 'Legendary') {
        setRarityFlash('legendary')
        if (rarityFlashTimerRef.current) clearTimeout(rarityFlashTimerRef.current)
        rarityFlashTimerRef.current = setTimeout(() => setRarityFlash(null), 350)
      } else if (rarity === 'Super Rare' || rarity === 'Super_rare') {
        setRarityFlash('superrare')
        if (rarityFlashTimerRef.current) clearTimeout(rarityFlashTimerRef.current)
        rarityFlashTimerRef.current = setTimeout(() => setRarityFlash(null), 350)
      }
    },
    [sensoryEnabled],
  )

  return {
    sensoryEnabled,
    rarityFlash,
    countBumping,
    toggleSensory,
    triggerFeedback,
  }
}
