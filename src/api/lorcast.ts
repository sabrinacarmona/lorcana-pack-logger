import type { RawCard } from '../types'
import { getCachedCards, setCachedCards } from './cache'

const API_BASE = 'https://api.lorcast.com/v0/cards'
const PER_PAGE = 200
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

interface ApiCard {
  name?: string
  version?: string
  subtitle?: string
  set?: { id?: string | number; name?: string }
  set_id?: string | number
  set_name?: string
  collector_number?: string | number
  number?: string | number
  cost?: number
  ink_cost?: number
  ink?: string
  color?: string
  rarity?: string
  type?: string
  classifications?: string
}

interface ApiResponse {
  results?: ApiCard[]
  data?: ApiCard[]
}

function mapApiCards(results: ApiCard[]): RawCard[] {
  return results.map((c): RawCard => [
    c.name || '',
    c.version || c.subtitle || '',
    String((c.set && c.set.id) || c.set_id || ''),
    (c.set && c.set.name) || c.set_name || '',
    String(c.collector_number || c.number || ''),
    c.cost || c.ink_cost || 0,
    c.ink || c.color || '',
    c.rarity || '',
    c.type || c.classifications || '',
  ])
}

/**
 * Fetches the complete card database from lorcast.com API.
 * Uses localStorage cache (24h) and paginates through all results.
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

  // Fetch from API with pagination
  try {
    const allCards: RawCard[] = []
    let page = 1

    while (true) {
      const response = await fetchWithResilience(
        `${API_BASE}?page=${page}&per_page=${PER_PAGE}`,
      )

      const json: ApiResponse | ApiCard[] = await response.json()
      const results: ApiCard[] = Array.isArray(json)
        ? json
        : json.results || json.data || []

      if (!Array.isArray(results) || results.length === 0) break

      allCards.push(...mapApiCards(results))

      if (results.length < PER_PAGE) break
      page++
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
