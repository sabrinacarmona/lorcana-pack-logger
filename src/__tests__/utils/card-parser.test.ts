import { describe, it, expect } from 'vitest'
import { parseCards } from '../../utils/card-parser'
import type { RawCard } from '../../types'

const SAMPLE_CARDS: RawCard[] = [
  ['Ariel', 'On Human Legs', '1', 'The First Chapter', '1', 4, 'Amber', 'Uncommon', 'Character'],
  ['Hades', 'King of Olympus', '1', 'The First Chapter', '5', 8, 'Amber', 'Rare', 'Character'],
  ['Elsa', 'Snow Queen', '2', 'Rise of the Floodborn', '10', 6, 'Sapphire', 'Legendary', 'Character'],
]

describe('parseCards', () => {
  it('returns empty array for null input', () => {
    expect(parseCards(null)).toEqual([])
  })

  it('parses cards with correct fields', () => {
    const cards = parseCards(SAMPLE_CARDS)
    expect(cards[0]!.name).toBe('Ariel')
    expect(cards[0]!.version).toBe('On Human Legs')
    expect(cards[0]!.display).toBe('Ariel \u2013 On Human Legs')
    expect(cards[0]!.setCode).toBe('1')
    expect(cards[0]!.cn).toBe('1')
    expect(cards[0]!.ink).toBe('Amber')
    expect(cards[0]!.rarity).toBe('Uncommon')
    expect(cards[0]!.type).toEqual(['Character'])
  })

  it('sorts by set code then collector number', () => {
    const cards = parseCards(SAMPLE_CARDS)
    expect(cards[0]!.setCode).toBe('1')
    expect(cards[0]!.cn).toBe('1')
    expect(cards[1]!.cn).toBe('5')
    expect(cards[2]!.setCode).toBe('2')
  })

  it('handles cards without version', () => {
    const raw: RawCard[] = [['Mickey', '', '1', 'TFC', '3', 2, 'Ruby', 'Common', 'Character']]
    const cards = parseCards(raw)
    expect(cards[0]!.display).toBe('Mickey')
    expect(cards[0]!.version).toBe('')
  })

  it('handles mixed set codes (numeric and string)', () => {
    const raw: RawCard[] = [
      ['Card A', '', 'P1', 'Promo Set 1', '1', 1, 'Amber', 'Promo', ''],
      ['Card B', '', '3', 'Into the Inklands', '1', 1, 'Ruby', 'Common', ''],
    ]
    const cards = parseCards(raw)
    // Numeric sets come first
    expect(cards[0]!.setCode).toBe('3')
    expect(cards[1]!.setCode).toBe('P1')
  })
})
