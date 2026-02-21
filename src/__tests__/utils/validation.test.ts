import { describe, it, expect } from 'vitest'
import { validatePulls } from '../../utils/validation'
import type { Pull } from '../../types'

function makePull(setCode: string, cn: string): Pull {
  return {
    key: `${setCode}-${cn}-normal`,
    card: {
      name: 'Test', version: '', display: 'Test',
      setCode, setName: 'Test Set', cn,
      cost: 1, ink: 'Amber', rarity: 'Common', type: ['Character'],
    },
    variant: 'normal',
    count: 1,
    packNumber: 1,
  }
}

describe('validatePulls', () => {
  it('returns no warnings for valid pulls', () => {
    const warnings = validatePulls([makePull('1', '42'), makePull('11', '200')])
    expect(warnings).toHaveLength(0)
  })

  it('warns on unknown set code', () => {
    const warnings = validatePulls([makePull('99', '1')])
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain('Unknown set code')
  })

  it('warns on collector number > 300', () => {
    const warnings = validatePulls([makePull('1', '999')])
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain('Unusual collector number')
  })

  it('warns on non-numeric collector number', () => {
    const warnings = validatePulls([makePull('1', 'abc')])
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain('Unusual collector number')
  })

  it('accepts all valid set codes', () => {
    const codes = ['1','2','3','4','5','6','7','8','9','10','11','P1','P2','cp','D23']
    const pulls = codes.map(c => makePull(c, '1'))
    expect(validatePulls(pulls)).toHaveLength(0)
  })
})
