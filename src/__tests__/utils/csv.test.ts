import { describe, it, expect } from 'vitest'
import { generateCSV } from '../../utils/csv'
import type { Pull } from '../../types'

function makePull(overrides: Partial<Pull> = {}): Pull {
  return {
    key: '1-1-normal',
    card: {
      name: 'Ariel',
      version: 'On Human Legs',
      display: 'Ariel \u2013 On Human Legs',
      setCode: '1',
      setName: 'The First Chapter',
      cn: '1',
      cost: 4,
      ink: 'Amber',
      rarity: 'Uncommon',
      type: ['Character'],
    },
    variant: 'normal',
    count: 2,
    packNumber: 1,
    ...overrides,
  }
}

describe('generateCSV', () => {
  it('generates header row with trailing newline when empty', () => {
    const csv = generateCSV([])
    expect(csv.trim()).toBe('Set Number,Card Number,Variant,Count')
  })

  it('generates correct data row', () => {
    const csv = generateCSV([makePull()])
    const lines = csv.split('\n')
    expect(lines).toHaveLength(2)
    expect(lines[1]).toBe('1,1,normal,2')
  })

  it('handles foil variant', () => {
    const csv = generateCSV([makePull({ key: '1-1-foil', variant: 'foil', count: 1 })])
    expect(csv).toContain('foil,1')
  })

  it('handles multiple pulls', () => {
    const pulls = [
      makePull(),
      makePull({ key: '2-5-normal', card: { ...makePull().card, setCode: '2', cn: '5' }, count: 3 }),
    ]
    const lines = generateCSV(pulls).split('\n')
    expect(lines).toHaveLength(3)
  })
})
