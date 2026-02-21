import { describe, it, expect, beforeEach } from 'vitest'
import { getCachedCards, setCachedCards } from '../../api/cache'

describe('card cache versioning', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns null when cache is empty', () => {
    expect(getCachedCards()).toBeNull()
  })

  it('returns cached cards when version matches', () => {
    const cards = [['Ariel', 'On Human Legs', '1', 'TFC', '1', 4, 'Amber', 'Uncommon', 'Character']] as any
    setCachedCards(cards)
    expect(getCachedCards()).toEqual(cards)
  })

  it('invalidates cache when version is missing (legacy data)', () => {
    // Simulate pre-versioning cache format
    localStorage.setItem(
      'lorcana_card_cache',
      JSON.stringify({
        data: [['test']],
        timestamp: Date.now(),
      }),
    )
    expect(getCachedCards()).toBeNull()
    // Should also remove the stale entry
    expect(localStorage.getItem('lorcana_card_cache')).toBeNull()
  })

  it('invalidates cache when version is wrong', () => {
    localStorage.setItem(
      'lorcana_card_cache',
      JSON.stringify({
        version: 999,
        data: [['test']],
        timestamp: Date.now(),
      }),
    )
    expect(getCachedCards()).toBeNull()
  })

  it('invalidates cache when expired', () => {
    localStorage.setItem(
      'lorcana_card_cache',
      JSON.stringify({
        version: 1,
        data: [['test']],
        timestamp: Date.now() - 90000000, // > 24 hours
      }),
    )
    expect(getCachedCards()).toBeNull()
  })

  it('handles corrupted JSON gracefully', () => {
    localStorage.setItem('lorcana_card_cache', 'not-json{{{')
    expect(getCachedCards()).toBeNull()
    expect(localStorage.getItem('lorcana_card_cache')).toBeNull()
  })
})
