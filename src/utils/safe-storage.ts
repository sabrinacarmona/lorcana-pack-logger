export type StorageResult = 'ok' | 'quota_warning' | 'quota_exceeded' | 'error'

const QUOTA_WARNING_BYTES = 4_000_000 // Warn at ~4MB (80% of 5MB limit)

/**
 * Estimate current localStorage usage in bytes (UTF-16 = 2 bytes per char).
 */
function estimateUsage(): number {
  try {
    let total = 0
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key) {
        total += (key.length + (localStorage.getItem(key)?.length ?? 0)) * 2
      }
    }
    return total
  } catch {
    return 0
  }
}

/**
 * Safe wrapper around localStorage that silently handles errors
 * (quota exceeded, private browsing restrictions, etc.)
 * Returns a StorageResult indicating success or quota state.
 */
export const SafeStorage = {
  getItem(key: string): string | null {
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  },

  setItem(key: string, value: string): StorageResult {
    try {
      localStorage.setItem(key, value)
      const usage = estimateUsage()
      if (usage > QUOTA_WARNING_BYTES) {
        console.warn(
          `[SafeStorage] localStorage usage is high: ~${(usage / 1_000_000).toFixed(1)}MB`,
        )
        return 'quota_warning'
      }
      return 'ok'
    } catch (err) {
      if (
        err instanceof DOMException &&
        (err.name === 'QuotaExceededError' || err.code === 22)
      ) {
        console.error('[SafeStorage] localStorage quota exceeded')
        return 'quota_exceeded'
      }
      return 'error'
    }
  },

  removeItem(key: string): boolean {
    try {
      localStorage.removeItem(key)
      return true
    } catch {
      return false
    }
  },

  getJSON<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(key)
      return raw ? (JSON.parse(raw) as T) : fallback
    } catch {
      return fallback
    }
  },

  setJSON(key: string, value: unknown): StorageResult {
    try {
      localStorage.setItem(key, JSON.stringify(value))
      const usage = estimateUsage()
      if (usage > QUOTA_WARNING_BYTES) {
        console.warn(
          `[SafeStorage] localStorage usage is high: ~${(usage / 1_000_000).toFixed(1)}MB`,
        )
        return 'quota_warning'
      }
      return 'ok'
    } catch (err) {
      if (
        err instanceof DOMException &&
        (err.name === 'QuotaExceededError' || err.code === 22)
      ) {
        console.error('[SafeStorage] localStorage quota exceeded')
        return 'quota_exceeded'
      }
      return 'error'
    }
  },

  /**
   * Returns estimated localStorage usage in bytes.
   */
  estimateUsage,
}
