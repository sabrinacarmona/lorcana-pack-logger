import type { RawCard } from '../types'
import { getCachedCards, setCachedCards } from './cache'

const API_BASE = 'https://api.lorcast.com/v0'
const TIMEOUT_MS = 8000
const MAX_RETRIES = 1

/**
 * Fetch with timeout and retry. Aborts after TIMEOUT_MS and retries once on failure.
 */
async function fetchWithResilience(url: string, attempt = 0): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const response = await fetch(url, { signal: controller.signal })
    clearTimeout(timer)
    if (!response.ok) throw new Error(`API ${response.status}`)
    return response
  } catch (err) {
    clearTimeout(timer)
    if (attempt < MAX_RETRIES) {
      return fetchWithResilience(url, attempt + 1)
    }
    throw err
  }
}

interface ApiSet {
  code: string
  name: string
}

interface ApiCard {
  name?: string
  version?: string
  set?: { code?: string; name?: string }
  collector_number?: string | number
  cost?: number
  /** Single ink for mono-ink cards (e.g. "Amber"). Null for dual-ink cards. */
  ink?: string | null
  /** Array of inks for dual-ink cards (e.g. ["Sapphire", "Steel"]). */
  inks?: string[]
  rarity?: string
  type?: string | string[]
  classifications?: string | string[]
  image_uris?: {
    digital?: {
      small?: string
      normal?: string
      large?: string
    }
  }
}

function mapApiCards(cards: ApiCard[]): RawCard[] {
  return cards.map((c): RawCard => {
    const typeVal = Array.isArray(c.type) ? c.type.join(' ') : c.type || ''
    const classVal = Array.isArray(c.classifications) ? c.classifications.join(' ') : c.classifications || ''
    const combined = [typeVal, classVal].filter(Boolean).join(' ')

    return [
      c.name || '',
      c.version || '',
      String(c.set?.code || ''),
      c.set?.name || '',
      String(c.collector_number || ''),
      c.cost || 0,
      // Dual-ink cards have ink: null and inks: ["Sapphire", "Steel"].
      // Store as "Sapphire/Steel" so the rest of the app can handle both formats.
      c.ink || (Array.isArray(c.inks) && c.inks.length > 0 ? c.inks.join('/') : ''),
      c.rarity || '',
      combined,
      c.image_uris?.digital?.small || '',
    ]
  })
}

/**
 * Fetches the complete card database from lorcast.com API.
 * Uses localStorage cache (24h). Fetches all sets, then all cards per set.
 * Returns { data, source } where source indicates freshness.
 */
export async function fetchCardDatabase(): Promise<{
  data: RawCard[] | null
  source: 'cached' | 'updated' | 'offline'
}> {
  // Check cache first
  const cached = getCachedCards()
  if (cached) {
    return { data: cached, source: 'cached' }
  }

  // Fetch set list, then all cards per set
  try {
    const setsResponse = await fetchWithResilience(`${API_BASE}/sets`)
    const setsJson = await setsResponse.json()
    const sets: ApiSet[] = setsJson.results || setsJson || []

    if (!Array.isArray(sets) || sets.length === 0) {
      return { data: null, source: 'offline' }
    }

    const allCards: RawCard[] = []

    // Fetch cards for each set concurrently (in batches of 4 to be polite)
    const BATCH_SIZE = 4
    for (let i = 0; i < sets.length; i += BATCH_SIZE) {
      const batch = sets.slice(i, i + BATCH_SIZE)
      const results = await Promise.allSettled(
        batch.map(async (set) => {
          const res = await fetchWithResilience(`${API_BASE}/sets/${set.code}/cards`)
          const cards: ApiCard[] = await res.json()
          return Array.isArray(cards) ? mapApiCards(cards) : []
        }),
      )

      for (const result of results) {
        if (result.status === 'fulfilled') {
          allCards.push(...result.value)
        }
      }
    }

    if (allCards.length > 0) {
      setCachedCards(allCards)
      return { data: allCards, source: 'updated' }
    }

    return { data: null, source: 'offline' }
  } catch (err) {
    console.error('Failed to fetch cards:', err)
    return { data: null, source: 'offline' }
  }
}
