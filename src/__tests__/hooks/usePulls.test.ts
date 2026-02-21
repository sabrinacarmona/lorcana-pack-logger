import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePulls } from '../../hooks/usePulls'
import type { Card } from '../../types'

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    name: 'Ariel',
    version: 'On Human Legs',
    display: 'Ariel – On Human Legs',
    setCode: '1',
    setName: 'The First Chapter',
    cn: '1',
    cost: 4,
    ink: 'Amber',
    rarity: 'Uncommon',
    type: ['Character'],
    ...overrides,
  }
}

describe('usePulls', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('initializes with empty pulls array', () => {
    const { result } = renderHook(() => usePulls())
    expect(result.current.pulls).toEqual([])
    expect(result.current.totalCards).toBe(0)
  })

  it('adds a new pull and returns key', () => {
    const { result } = renderHook(() => usePulls())
    const card = makeCard()
    let key: string

    act(() => {
      key = result.current.addPull(card, 'normal', 1)
    })

    expect(key!).toBe('1-1-normal')
    expect(result.current.pulls).toHaveLength(1)
    expect(result.current.pulls[0]).toMatchObject({
      key: '1-1-normal',
      card,
      variant: 'normal',
      count: 1,
      packNumber: 1,
    })
  })

  it('increments count if pull key already exists', () => {
    const { result } = renderHook(() => usePulls())
    const card = makeCard()

    act(() => {
      result.current.addPull(card, 'normal', 1)
    })

    expect(result.current.pulls[0]!.count).toBe(1)

    act(() => {
      result.current.addPull(card, 'normal', 1)
    })

    expect(result.current.pulls).toHaveLength(1)
    expect(result.current.pulls[0]!.count).toBe(2)
  })

  it('updates pull count by delta', () => {
    const { result } = renderHook(() => usePulls())
    const card = makeCard()

    act(() => {
      result.current.addPull(card, 'normal', 1)
    })

    act(() => {
      result.current.updateCount('1-1-normal', 2)
    })

    expect(result.current.pulls[0]!.count).toBe(3)
  })

  it('removes pull when count reaches 0', () => {
    const { result } = renderHook(() => usePulls())
    const card = makeCard()

    act(() => {
      result.current.addPull(card, 'normal', 1)
    })

    expect(result.current.pulls).toHaveLength(1)

    act(() => {
      result.current.updateCount('1-1-normal', -1)
    })

    expect(result.current.pulls).toHaveLength(0)
  })

  it('ignores updateCount for non-existent pull', () => {
    const { result } = renderHook(() => usePulls())

    act(() => {
      result.current.updateCount('nonexistent-key', 1)
    })

    expect(result.current.pulls).toHaveLength(0)
  })

  it('removes pull by key', () => {
    const { result } = renderHook(() => usePulls())
    const card = makeCard()

    act(() => {
      result.current.addPull(card, 'normal', 1)
    })

    expect(result.current.pulls).toHaveLength(1)

    act(() => {
      result.current.removePull('1-1-normal')
    })

    expect(result.current.pulls).toHaveLength(0)
  })

  it('clears all pulls', () => {
    const { result } = renderHook(() => usePulls())
    const card1 = makeCard()
    const card2 = makeCard({ cn: '2', name: 'Elsa' })

    act(() => {
      result.current.addPull(card1, 'normal', 1)
      result.current.addPull(card2, 'foil', 1)
    })

    expect(result.current.pulls).toHaveLength(2)

    act(() => {
      result.current.clearPulls()
    })

    expect(result.current.pulls).toHaveLength(0)
  })

  it('calculates totalCards correctly', () => {
    const { result } = renderHook(() => usePulls())
    const card1 = makeCard()
    const card2 = makeCard({ cn: '2', name: 'Elsa' })

    act(() => {
      result.current.addPull(card1, 'normal', 1)
      result.current.addPull(card1, 'normal', 1)
      result.current.addPull(card2, 'foil', 1)
    })

    expect(result.current.totalCards).toBe(3)
  })

  it('calculates totalFoils correctly', () => {
    const { result } = renderHook(() => usePulls())
    const card = makeCard()

    act(() => {
      result.current.addPull(card, 'normal', 1)
      result.current.addPull(card, 'foil', 1)
      result.current.addPull(card, 'foil', 1)
    })

    expect(result.current.totalFoils).toBe(2)
  })

  it('calculates totalLegendary correctly', () => {
    const { result } = renderHook(() => usePulls())
    const legendary = makeCard({ rarity: 'Legendary' })
    const uncommon = makeCard({ cn: '2', rarity: 'Uncommon' })

    act(() => {
      result.current.addPull(legendary, 'normal', 1)
      result.current.addPull(legendary, 'normal', 1)
      result.current.addPull(uncommon, 'normal', 1)
    })

    expect(result.current.totalLegendary).toBe(2)
  })

  it('calculates totalSuperRare correctly', () => {
    const { result } = renderHook(() => usePulls())
    const superRare = makeCard({ rarity: 'Super Rare' })
    const superRare2 = makeCard({ cn: '2', rarity: 'Super_rare' })
    const uncommon = makeCard({ cn: '3', rarity: 'Uncommon' })

    act(() => {
      result.current.addPull(superRare, 'normal', 1)
      result.current.addPull(superRare2, 'normal', 1)
      result.current.addPull(superRare2, 'normal', 1)
      result.current.addPull(uncommon, 'normal', 1)
    })

    expect(result.current.totalSuperRare).toBe(3)
  })

  it('calculates totalEnchanted correctly', () => {
    const { result } = renderHook(() => usePulls())
    const enchanted = makeCard({ rarity: 'Enchanted' })
    const uncommon = makeCard({ cn: '2', rarity: 'Uncommon' })

    act(() => {
      result.current.addPull(enchanted, 'normal', 1)
      result.current.addPull(uncommon, 'normal', 1)
    })

    expect(result.current.totalEnchanted).toBe(1)
  })

  it('calculates totalPacks as max packNumber', () => {
    const { result } = renderHook(() => usePulls())
    const card1 = makeCard()
    const card2 = makeCard({ cn: '2' })
    const card3 = makeCard({ cn: '3' })

    act(() => {
      result.current.addPull(card1, 'normal', 2)
      result.current.addPull(card2, 'normal', 5)
      result.current.addPull(card3, 'normal', 3)
    })

    expect(result.current.totalPacks).toBe(5)
  })

  it('groups pulls by set name and sorts by collector number', () => {
    const { result } = renderHook(() => usePulls())
    const setA_1 = makeCard({ setCode: 'A', setName: 'Set A', cn: '10' })
    const setA_2 = makeCard({ setCode: 'A', setName: 'Set A', cn: '5', name: 'Card 5' })
    const setB_1 = makeCard({ setCode: 'B', setName: 'Set B', cn: '2', name: 'Card 2' })

    act(() => {
      result.current.addPull(setA_1, 'normal', 1)
      result.current.addPull(setB_1, 'normal', 1)
      result.current.addPull(setA_2, 'normal', 1)
    })

    expect(Object.keys(result.current.groupedPulls)).toHaveLength(2)
    expect(result.current.groupedPulls['Set A']).toHaveLength(2)
    expect(result.current.groupedPulls['Set A']![0]!.card.cn).toBe('5')
    expect(result.current.groupedPulls['Set A']![1]!.card.cn).toBe('10')
    expect(result.current.groupedPulls['Set B']).toHaveLength(1)
  })

  it('persists pulls to localStorage', () => {
    const { result } = renderHook(() => usePulls())
    const card = makeCard()

    act(() => {
      result.current.addPull(card, 'normal', 1)
    })

    const stored = localStorage.getItem('lorcana_session_pulls')
    expect(stored).toBeTruthy()

    const parsed = JSON.parse(stored!)
    expect(parsed).toHaveLength(1)
    expect(parsed[0].key).toBe('1-1-normal')
  })
})
