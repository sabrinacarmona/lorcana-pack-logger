import { describe, it, expect } from 'vitest'
import { generateSetColour, getSetColour } from '../../utils/set-colours'

describe('generateSetColour', () => {
  it('returns an HSL colour string', () => {
    const colour = generateSetColour('12')
    expect(colour).toMatch(/^hsl\(\d+, 55%, 55%\)$/)
  })

  it('is deterministic (same input produces same output)', () => {
    expect(generateSetColour('abc')).toBe(generateSetColour('abc'))
  })

  it('produces different colours for different set IDs', () => {
    const a = generateSetColour('1')
    const b = generateSetColour('99')
    expect(a).not.toBe(b)
  })
})

describe('getSetColour', () => {
  it('returns hardcoded colour for known sets', () => {
    // Set 1 (The First Chapter) has hardcoded colour #94A3B5
    const colour = getSetColour('1')
    expect(colour).toBe('#94A3B5')
  })

  it('returns generated colour for unknown sets', () => {
    const colour = getSetColour('99')
    expect(colour).toMatch(/^hsl\(\d+, 55%, 55%\)$/)
  })
})
