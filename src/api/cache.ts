import type { RawCard } from '../types'
import { SafeStorage } from '../utils/safe-storage'

const CACHE_KEY = 'lorcana_card_cache'
const CACHE_DURATION_MS = 86400000 // 24 hours

/**
 * Increment this when the RawCard tuple structure changes.
 * Stale caches with a different version are silently invalidated.
 */
const CACHE_VERSION = 2

interface CardCache {
  version: number
  data: RawCard[]
  timestamp: number
}

export function getCachedCards(): RawCard[] | null {
  const cached = SafeStorage.getItem(CACHE_KEY)
  if (!cached) return null

  try {
    const parsed: CardCache = JSON.parse(cached)

    // Reject cache if version mismatch or missing
    if (parsed.version !== CACHE_VERSION) {
      SafeStorage.removeItem(CACHE_KEY)
      return null
    }

    if (parsed.timestamp && Date.now() - parsed.timestamp < CACHE_DURATION_MS) {
      return parsed.data
    }
  } catch {
    // Corrupted cache — remove it
    SafeStorage.removeItem(CACHE_KEY)
  }
  return null
}

export function setCachedCards(cards: RawCard[]): void {
  SafeStorage.setJSON(CACHE_KEY, {
    version: CACHE_VERSION,
    data: cards,
    timestamp: Date.now(),
  })
}
