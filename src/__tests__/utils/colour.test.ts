import { describe, it, expect } from 'vitest'
import { hexToRgba, inkGradientStyle } from '../../utils/colour'

describe('hexToRgba', () => {
  it('converts pure red', () => {
    expect(hexToRgba('#FF0000', 0.5)).toBe('rgba(255,0,0,0.5)')
  })

  it('converts pure green', () => {
    expect(hexToRgba('#00FF00', 1)).toBe('rgba(0,255,0,1)')
  })

  it('converts a real ink colour', () => {
    expect(hexToRgba('#E89C24', 0.12)).toBe('rgba(232,156,36,0.12)')
  })

  it('handles zero alpha', () => {
    expect(hexToRgba('#000000', 0)).toBe('rgba(0,0,0,0)')
  })
})

describe('inkGradientStyle', () => {
  it('returns gradient for known ink', () => {
    const style = inkGradientStyle('Amber', 0.08)
    expect(style.backgroundImage).toContain('linear-gradient')
    expect(style.backgroundImage).toContain('rgba(232,156,36,0.08)')
  })

  it('returns empty object for unknown ink', () => {
    expect(inkGradientStyle('Nonexistent', 0.08)).toEqual({})
  })
})
