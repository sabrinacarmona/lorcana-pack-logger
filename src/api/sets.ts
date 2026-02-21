import { SafeStorage } from '../utils/safe-storage'
import { SET_MAP } from '../constants/sets'

const SETS_API = 'https://api.lorcast.com/v0/sets'
const CACHE_KEY = 'lorcana_set_metadata'
const CACHE_DURATION_MS = 604800000 // 7 days
const TIMEOUT_MS = 8000
const MAX_RETRIES = 1

export interface SetInfo {
  id: string
  name: string
  releasedAt: string
}

interface SetsCache {
  data: SetInfo[]
  timestamp: number
}

interface ApiSet {
  id?: string | number
  name?: string
  released_at?: string
}

/**
 * Fetch with timeout and retry, scoped to the sets endpoint.
 */
async function fetchWithResilience(url: string, attempt = 0): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const response = await fetch(url, { signal: controller.signal })
    clearTimeout(timer)
    if (!response.ok) throw new Error(`Sets API ${response.status}`)
    return response
  } catch (err) {
    clearTimeout(timer)
    if (attempt < MAX_RETRIES) {
      return fetchWithResilience(url, attempt + 1)
    }
    throw err
  }
}

function getCachedSets(): SetInfo[] | null {
  const cached = SafeStorage.getItem(CACHE_KEY)
  if (!cached) return null

  try {
    const parsed: SetsCache = JSON.parse(cached)
    if (parsed.timestamp && Date.now() - parsed.timestamp < CACHE_DURATION_MS) {
      return parsed.data
    }
  } catch {
    // Corrupted cache
  }
  return null
}

function setCachedSets(data: SetInfo[]): void {
  SafeStorage.setJSON(CACHE_KEY, { data, timestamp: Date.now() })
}

/**
 * Fetches set metadata from the lorcast API.
 * Caches for 7 days. Falls back to hardcoded SET_MAP on failure.
 */
export async function fetchSetMetadata(): Promise<{
  data: SetInfo[]
  source: 'cached' | 'updated' | 'offline'
}> {
  // Check cache
  const cached = getCachedSets()
  if (cached) {
    return { data: cached, source: 'cached' }
  }

  // Fetch from API
  try {
    const response = await fetchWithResilience(SETS_API)
    const json = await response.json()
    const raw: ApiSet[] = Array.isArray(json)
      ? json
      : json.results || json.data || []

    const sets: SetInfo[] = raw
      .filter((s) => s.id != null && s.name)
      .map((s) => ({
        id: String(s.id),
        name: s.name!,
        releasedAt: s.released_at || '',
      }))

    if (sets.length > 0) {
      setCachedSets(sets)
      return { data: sets, source: 'updated' }
    }

    return { data: fallbackSets(), source: 'offline' }
  } catch (err) {
    console.error('Failed to fetch sets:', err)
    return { data: fallbackSets(), source: 'offline' }
  }
}

/**
 * Convert hardcoded SET_MAP to SetInfo[] as offline fallback.
 */
function fallbackSets(): SetInfo[] {
  return Object.entries(SET_MAP).map(([id, name]) => ({
    id,
    name,
    releasedAt: '',
  }))
}
