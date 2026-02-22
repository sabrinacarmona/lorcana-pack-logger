import { describe, it, expect } from 'vitest'
import { matchCardByCollectorNumber } from '../../utils/card-cn-matcher'
import type { Card } from '../../types'

function makeCard(overrides: Partial<Card> & { name: string }): Card {
  const name = overrides.name
  const version = overrides.version || ''
  return {
    name,
    version,
    display: version ? `${name} – ${version}` : name,
    setCode: overrides.setCode || '1',
    setName: overrides.setName || 'The First Chapter',
    cn: overrides.cn || '1',
    cost: overrides.cost || 3,
    ink: overrides.ink || 'Amber',
    rarity: overrides.rarity || 'Common',
    type: overrides.type || ['Character'],
  }
}

const testCards: Card[] = [
  makeCard({ name: 'Ariel', version: 'On Human Legs', setCode: '1', cn: '1' }),
  makeCard({ name: 'Ariel', version: 'Spectacular Singer', setCode: '2', cn: '15' }),
  makeCard({ name: 'Elsa', version: 'Snow Queen', setCode: '1', cn: '42' }),
  makeCard({ name: 'Mickey Mouse', version: 'True Friend', setCode: '1', cn: '100' }),
  makeCard({ name: 'Simba', version: 'Returned King', setCode: '3', cn: '55' }),
  makeCard({ name: 'Maleficent', version: 'Monstrous Dragon', setCode: '1', cn: '85' }),
  // Same cn as Ariel set 1 but in a different set
  makeCard({ name: 'Stitch', version: 'Rock Star', setCode: '3', cn: '1' }),
]

describe('matchCardByCollectorNumber', () => {
  it('exact match with set filter active', () => {
    const result = matchCardByCollectorNumber('42', testCards, '1')
    expect(result.card?.name).toBe('Elsa')
    expect(result.similarity).toBe(1)
    expect(result.candidates).toHaveLength(0)
  })

  it('exact match without set filter when cn is unique across all sets', () => {
    const result = matchCardByCollectorNumber('100', testCards, 'all')
    expect(result.card?.name).toBe('Mickey Mouse')
    expect(result.similarity).toBe(1)
  })

  it('returns disambiguation candidates when cn exists in multiple sets', () => {
    const result = matchCardByCollectorNumber('1', testCards, 'all')
    expect(result.card).toBeNull()
    expect(result.candidates).toHaveLength(2)
    expect(result.similarity).toBe(1)
    const names = result.candidates.map((c) => c.name)
    expect(names).toContain('Ariel')
    expect(names).toContain('Stitch')
  })

  it('resolves multi-set cn when set filter is active', () => {
    const result = matchCardByCollectorNumber('1', testCards, '3')
    expect(result.card?.name).toBe('Stitch')
    expect(result.candidates).toHaveLength(0)
  })

  it('returns no match for unknown cn', () => {
    const result = matchCardByCollectorNumber('999', testCards, 'all')
    expect(result.card).toBeNull()
    expect(result.candidates).toHaveLength(0)
    expect(result.similarity).toBe(0)
  })

  it('returns no match for empty cn', () => {
    const result = matchCardByCollectorNumber('', testCards, 'all')
    expect(result.card).toBeNull()
    expect(result.similarity).toBe(0)
  })

  it('returns no match for cn in wrong set', () => {
    const result = matchCardByCollectorNumber('55', testCards, '1')
    expect(result.card).toBeNull()
    expect(result.similarity).toBe(0)
  })

  it('handles empty card list', () => {
    const result = matchCardByCollectorNumber('42', [], 'all')
    expect(result.card).toBeNull()
    expect(result.similarity).toBe(0)
  })

  it('limits disambiguation candidates to 6', () => {
    // Create 8 cards with the same cn in different sets
    const manyCards = Array.from({ length: 8 }, (_, i) =>
      makeCard({ name: `Card ${i}`, setCode: String(i + 1), cn: '50' }),
    )
    const result = matchCardByCollectorNumber('50', manyCards, 'all')
    expect(result.card).toBeNull()
    expect(result.candidates).toHaveLength(6)
  })

  it('uses total to narrow multi-set matches to the right set', () => {
    // Two cards with cn "102" in different sets
    // Set "1" has 204 cards (has a card with cn "204"), set "3" has 100 cards (no cn "204")
    const cardsWithTotals = [
      makeCard({ name: 'Pacha', version: 'Trekmate', setCode: '1', cn: '102' }),
      makeCard({ name: 'Stolen Scimitar', setCode: '3', cn: '102' }),
      // The "total" card — proves set "1" has at least 204 cards
      makeCard({ name: 'Last Card', setCode: '1', cn: '204' }),
    ]
    const result = matchCardByCollectorNumber('102', cardsWithTotals, 'all', '204')
    expect(result.card?.name).toBe('Pacha')
    expect(result.candidates).toHaveLength(0)
    expect(result.similarity).toBe(1)
  })

  it('falls back to disambiguation when total matches multiple sets', () => {
    // Both sets have a card at cn "204"
    const cardsWithTotals = [
      makeCard({ name: 'Pacha', setCode: '1', cn: '102' }),
      makeCard({ name: 'Stolen Scimitar', setCode: '3', cn: '102' }),
      makeCard({ name: 'Last A', setCode: '1', cn: '204' }),
      makeCard({ name: 'Last B', setCode: '3', cn: '204' }),
    ]
    const result = matchCardByCollectorNumber('102', cardsWithTotals, 'all', '204')
    expect(result.card).toBeNull()
    expect(result.candidates).toHaveLength(2)
  })

  it('ignores total when set filter is active', () => {
    const result = matchCardByCollectorNumber('42', testCards, '1', '999')
    expect(result.card?.name).toBe('Elsa')
    expect(result.similarity).toBe(1)
  })

  // ── Dual-ink card tests ────────────────────────────────────────────

  it('matches dual-ink card when one detected ink overlaps', () => {
    const dualInkCards = [
      makeCard({ name: 'Maid Marian', version: 'Badminton Ace', setCode: '8', cn: '176', ink: 'Sapphire/Steel' }),
      makeCard({ name: 'Other Card', setCode: '9', cn: '176', ink: 'Ruby' }),
    ]
    // Detector found Sapphire — should match the dual-ink card
    const result = matchCardByCollectorNumber('176', dualInkCards, 'all', null, 'Sapphire', ['Sapphire'])
    expect(result.card?.name).toBe('Maid Marian')
  })

  it('matches dual-ink card when both detected inks overlap', () => {
    const dualInkCards = [
      makeCard({ name: 'Maid Marian', version: 'Badminton Ace', setCode: '8', cn: '176', ink: 'Sapphire/Steel' }),
      makeCard({ name: 'Other Card', setCode: '9', cn: '176', ink: 'Ruby' }),
    ]
    // Detector found both Sapphire and Steel
    const result = matchCardByCollectorNumber('176', dualInkCards, 'all', null, 'Sapphire', ['Sapphire', 'Steel'])
    expect(result.card?.name).toBe('Maid Marian')
  })

  it('narrows by ink when detected ink matches mono-ink card over dual-ink', () => {
    const mixedCards = [
      makeCard({ name: 'Dual Card', setCode: '8', cn: '50', ink: 'Amber/Emerald' }),
      makeCard({ name: 'Mono Card', setCode: '9', cn: '50', ink: 'Ruby' }),
    ]
    // Detector found Ruby — should match the mono card
    const result = matchCardByCollectorNumber('50', mixedCards, 'all', null, 'Ruby', ['Ruby'])
    expect(result.card?.name).toBe('Mono Card')
  })

  it('returns both as candidates when both share a detected ink', () => {
    const cards = [
      makeCard({ name: 'Card A', setCode: '1', cn: '10', ink: 'Amber/Ruby' }),
      makeCard({ name: 'Card B', setCode: '2', cn: '10', ink: 'Amber/Emerald' }),
    ]
    // Detector found Amber — both cards have Amber, so disambiguation needed
    const result = matchCardByCollectorNumber('10', cards, 'all', null, 'Amber', ['Amber'])
    expect(result.card).toBeNull()
    expect(result.candidates).toHaveLength(2)
  })
})
