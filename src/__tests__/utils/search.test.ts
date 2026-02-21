import { describe, it, expect } from 'vitest'
import { searchCards } from '../../utils/search'
import { parseCards } from '../../utils/card-parser'
import type { RawCard } from '../../types'

const RAW: RawCard[] = [
  ['Ariel', 'On Human Legs', '1', 'The First Chapter', '1', 4, 'Amber', 'Uncommon', 'Character'],
  ['Ariel', 'Spectacular Singer', '1', 'The First Chapter', '2', 3, 'Amber', 'Super_rare', 'Character'],
  ['Cinderella', 'Gentle and Kind', '1', 'The First Chapter', '3', 4, 'Amber', 'Uncommon', 'Character'],
  ['Hades', 'King of Olympus', '1', 'The First Chapter', '5', 8, 'Amber', 'Rare', 'Character'],
  ['Elsa', 'Snow Queen', '2', 'Rise of the Floodborn', '10', 6, 'Sapphire', 'Legendary', 'Character'],
]

const cards = parseCards(RAW)

describe('searchCards', () => {
  it('returns empty for empty query', () => {
    expect(searchCards('', cards, 'all')).toEqual([])
  })

  it('finds cards by name', () => {
    const results = searchCards('ariel', cards, 'all')
    expect(results.length).toBe(2)
    expect(results[0]!.name).toBe('Ariel')
  })

  it('ranks exact prefix match higher', () => {
    const results = searchCards('ariel', cards, 'all')
    // Both Ariels should be first, and "On Human Legs" comes before "Spectacular Singer" alphabetically by cn
    expect(results[0]!.name).toBe('Ariel')
    expect(results[1]!.name).toBe('Ariel')
  })

  it('filters by set', () => {
    const results = searchCards('elsa', cards, '2')
    expect(results.length).toBe(1)
    expect(results[0]!.setCode).toBe('2')
  })

  it('returns empty when set filter excludes all matches', () => {
    const results = searchCards('elsa', cards, '1')
    expect(results.length).toBe(0)
  })

  it('supports #number search for collector number', () => {
    const results = searchCards('#5', cards, 'all')
    expect(results.length).toBeGreaterThan(0)
    expect(results[0]!.cn).toBe('5')
  })

  it('supports bare number with set filter (v1.1.0)', () => {
    const results = searchCards('2', cards, '1')
    // Should prioritise collector number 2 in set 1
    expect(results[0]!.cn).toBe('2')
  })

  it('limits results to 20', () => {
    // Create a large card set
    const manyCards = Array.from({ length: 50 }, (_, i): RawCard =>
      ['Card', `Version ${i}`, '1', 'Set', String(i + 1), 1, 'Amber', 'Common', 'Character']
    )
    const parsed = parseCards(manyCards)
    const results = searchCards('card', parsed, 'all')
    expect(results.length).toBe(20)
  })

  it('matches multi-token queries', () => {
    const results = searchCards('ariel human', cards, 'all')
    expect(results.length).toBe(1)
    expect(results[0]!.version).toBe('On Human Legs')
  })
})
